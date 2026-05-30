const API_URL = "https://www.ebi.ac.uk/thornton-srv/m-csa/api/entries/?format=json&page_size=60";

const fallbackReactions = [
  {
    mcsaId: 1,
    enzyme: "glutamate racemase",
    ec: "5.1.1.3",
    steps: [
      {
        description: "Asp7 deprotonates Cys70, activating it.",
        figure: "https://www.ebi.ac.uk/thornton-srv/m-csa/media/schemes_svg/macie_entry_1_1_1",
      },
      {
        description:
          "Cys70 deprotonates L-glutamate and forms a planar enolate intermediate.",
        figure:
          "https://www.ebi.ac.uk/thornton-srv/m-csa/media/schemes_svg/macie_entry_1_mechanism_1_step_2_4fKdyFt",
      },
      {
        description:
          "The enolate collapses and transfers protonation to the opposite face, generating the opposite isomer.",
        figure:
          "https://www.ebi.ac.uk/thornton-srv/m-csa/media/schemes_svg/macie_entry_1_mechanism_1_step_3_ofPtCeJ",
      },
      {
        description:
          "Cys178 deprotonates Glu147 to reset the catalytic residues for another turnover.",
        figure:
          "https://www.ebi.ac.uk/thornton-srv/m-csa/media/schemes_svg/macie_entry_1_mechanism_1_step_4_X4F7jnc",
      },
    ],
  },
];

const reactionTitleEl = document.getElementById("reactionTitle");
const flashcardEl = document.getElementById("flashcard");
const stepMetaEl = document.getElementById("stepMeta");
const explainMetaEl = document.getElementById("explainMeta");
const stepImageEl = document.getElementById("stepImage");
const stepExplanationEl = document.getElementById("stepExplanation");
const frontFaceEl = document.getElementById("frontFace");
const backFaceEl = document.getElementById("backFace");
const flipBtn = document.getElementById("flipBtn");
const nextReactionBtn = document.getElementById("nextReactionBtn");
const statusEl = document.getElementById("status");

let reactions = [];
let reactionIndex = 0;
let stepIndex = 0;
let isFlipped = false;

function normalizeUrl(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `https://${url.replace(/^\/+/, "")}`;
}

function buildReactionsFromApi(results) {
  const built = [];

  for (const entry of results || []) {
    const mechanisms = entry?.reaction?.mechanisms || [];
    const detailed = mechanisms.find(
      (m) => m.is_detailed && Array.isArray(m.steps) && m.steps.length > 1,
    );

    if (!detailed) continue;

    const steps = detailed.steps
      .filter((s) => !s.is_product)
      .map((s) => ({
        description: s.description || "No explanation available for this step.",
        figure: normalizeUrl(s.figure),
      }))
      .filter((s) => s.figure || s.description);

    if (steps.length < 2) continue;

    built.push({
      mcsaId: entry.mcsa_id,
      enzyme: entry.enzyme_name || "Unknown enzyme",
      ec: entry.all_ecs?.[0] || entry?.reaction?.ec || "EC unknown",
      steps,
    });
  }

  return built;
}

async function loadReactions() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("API request failed");
    const data = await res.json();
    const parsed = buildReactionsFromApi(data.results);

    reactions = parsed.length ? parsed : fallbackReactions;
    if (!parsed.length) {
      statusEl.textContent = "Using built-in starter reaction (API had no detailed results).";
    }
  } catch (error) {
    reactions = fallbackReactions;
    statusEl.textContent = "Using offline starter reaction (API unavailable).";
  }

  reactionIndex = 0;
  stepIndex = 0;
  isFlipped = false;
  render();
}

function currentReaction() {
  return reactions[reactionIndex];
}

function currentStep() {
  return currentReaction().steps[stepIndex];
}

function render() {
  const reaction = currentReaction();
  const step = currentStep();
  const totalReactions = reactions.length;
  const totalSteps = reaction.steps.length;

  reactionTitleEl.textContent = `Reaction ${reactionIndex + 1}/${totalReactions}: ${reaction.enzyme} (EC ${reaction.ec})`;

  stepMetaEl.textContent = `Step ${stepIndex + 1}/${totalSteps}`;
  explainMetaEl.textContent = `Explanation for Step ${stepIndex + 1}/${totalSteps}`;
  stepExplanationEl.textContent = step.description;

  const imageUrl = step.figure;
  if (imageUrl) {
    stepImageEl.src = imageUrl;
    stepImageEl.classList.remove("hidden");
  } else {
    stepImageEl.removeAttribute("src");
    stepImageEl.classList.add("hidden");
  }

  frontFaceEl.classList.toggle("hidden", isFlipped);
  backFaceEl.classList.toggle("hidden", !isFlipped);

  const finishedThisReaction = stepIndex >= totalSteps - 1;
  nextReactionBtn.disabled = !finishedThisReaction;

  if (finishedThisReaction) {
    if (reactionIndex < totalReactions - 1) {
      statusEl.textContent = "Reaction complete. Tap 'Next Reaction' to continue.";
    } else {
      statusEl.textContent = "All loaded reactions complete. Refresh to restart.";
    }
  } else {
    statusEl.textContent = "Tap the card to move to the next step.";
  }
}

function goToNextStep() {
  const totalSteps = currentReaction().steps.length;
  if (stepIndex < totalSteps - 1) {
    stepIndex += 1;
    isFlipped = false;
    render();
  } else {
    render();
  }
}

function goToNextReaction() {
  if (nextReactionBtn.disabled) return;

  if (reactionIndex < reactions.length - 1) {
    reactionIndex += 1;
    stepIndex = 0;
    isFlipped = false;
    render();
  }
}

flashcardEl.addEventListener("click", goToNextStep);
flashcardEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    goToNextStep();
  }
});

flipBtn.addEventListener("click", () => {
  isFlipped = !isFlipped;
  render();
});

nextReactionBtn.addEventListener("click", goToNextReaction);

loadReactions();
