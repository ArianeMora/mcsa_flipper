const API_URL = "https://www.ebi.ac.uk/thornton-srv/m-csa/api/entries/?format=json&page_size=60";

const fallbackReactions = [
  {
    mcsaId: 1,
    enzyme: "glutamate racemase",
    ec: "5.1.1.3",
    intro:
      "Glutamate racemase produces D-glutamate, an essential building block in bacterial cell-wall peptidoglycan.",
    reactionSummary: "L-glutamate(1-) -> D-glutamate(1-)",
    structureImage: "https://cdn.rcsb.org/images/structures/1b73_assembly-1.jpeg",
    roles: ["Asp7A: proton acceptor, activator"],
    cards: [
      {
        type: "intro",
        description:
          "Two-base racemization mechanism. Catalytic cysteines shuttle protons across opposite faces of the substrate.",
        roles: [
          "Asp7A: hydrogen bond acceptor, hydrogen bond donor, proton acceptor, activator, electrostatic stabiliser",
          "Ser8A: increase basicity, hydrogen bond donor, electrostatic stabiliser",
          "Cys178A: activator, hydrogen bond acceptor, proton acceptor, proton donor",
          "Cys70A: hydrogen bond acceptor, hydrogen bond donor, proton acceptor, proton donor, activator, electrostatic stabiliser",
          "His180A: hydrogen bond donor, electrostatic stabiliser",
          "Glu147A(AA): hydrogen bond acceptor, hydrogen bond donor, proton donor, activator, electrostatic stabiliser, increase basicity",
        ],
        reactionImages: {
          reactant: "https://www.ebi.ac.uk/thornton-srv/m-csa/media/compound_images/29985_NxkMYSC.png",
          product: "https://www.ebi.ac.uk/thornton-srv/m-csa/media/compound_images/29986_SGvN4YB.png",
        },
      },
      {
        type: "step",
        description: "Asp7 deprotonates Cys70, activating it.",
        figure: "https://www.ebi.ac.uk/thornton-srv/m-csa/media/schemes_svg/macie_entry_1_1_1",
        roles: [
          "Glu147A(AA): hydrogen bond acceptor",
          "Asp7A: activator, hydrogen bond acceptor, proton acceptor",
          "His180A: hydrogen bond donor",
          "Cys70A: activator, hydrogen bond donor, proton donor",
          "Ser8A: hydrogen bond donor, electrostatic stabiliser, increase basicity",
        ],
      },
      {
        type: "step",
        description: "Cys70 deprotonates L-glutamate and forms a planar enolate intermediate.",
        figure:
          "https://www.ebi.ac.uk/thornton-srv/m-csa/media/schemes_svg/macie_entry_1_mechanism_1_step_2_4fKdyFt",
        roles: [
          "Glu147A(AA): hydrogen bond acceptor",
          "Asp7A: electrostatic stabiliser, hydrogen bond donor",
          "His180A: hydrogen bond donor",
          "Cys70A: activator, hydrogen bond acceptor, proton acceptor",
          "Ser8A: hydrogen bond donor",
        ],
      },
      {
        type: "step",
        description:
          "The enolate collapses and transfers protonation to the opposite face, generating the opposite isomer.",
        figure:
          "https://www.ebi.ac.uk/thornton-srv/m-csa/media/schemes_svg/macie_entry_1_mechanism_1_step_3_ofPtCeJ",
        roles: [
          "Cys178A: activator, hydrogen bond acceptor, proton donor",
          "Glu147A(AA): electrostatic stabiliser, hydrogen bond donor, increase basicity",
          "Asp7A: electrostatic stabiliser, hydrogen bond donor",
          "His180A: hydrogen bond donor",
          "Cys70A: electrostatic stabiliser, hydrogen bond donor",
          "Ser8A: hydrogen bond donor",
        ],
      },
      {
        type: "step",
        description:
          "Cys178 deprotonates Glu147 to reset the catalytic residues for another turnover.",
        figure:
          "https://www.ebi.ac.uk/thornton-srv/m-csa/media/schemes_svg/macie_entry_1_mechanism_1_step_4_X4F7jnc",
        roles: [
          "Cys178A: activator, hydrogen bond acceptor, proton acceptor",
          "Glu147A(AA): activator, hydrogen bond donor, hydrogen bond acceptor, proton donor",
          "Asp7A: hydrogen bond acceptor",
          "His180A: hydrogen bond donor, electrostatic stabiliser",
          "Ser8A: hydrogen bond donor",
        ],
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
const structureImageEl = document.getElementById("structureImage");
const reactantImageEl = document.getElementById("reactantImage");
const productImageEl = document.getElementById("productImage");
const reactionVisualEl = document.getElementById("reactionVisual");
const rolesListEl = document.getElementById("rolesList");
const introSummaryEl = document.getElementById("introSummary");
const frontFaceEl = document.getElementById("frontFace");
const backFaceEl = document.getElementById("backFace");
const backBtn = document.getElementById("backBtn");
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

function buildReactionEquation(compounds) {
  const left = (compounds || [])
    .filter((c) => c.type === "reactant")
    .map((c) => `${c.count > 1 ? `${c.count} ` : ""}${c.name}`)
    .join(" + ");
  const right = (compounds || [])
    .filter((c) => c.type === "product")
    .map((c) => `${c.count > 1 ? `${c.count} ` : ""}${c.name}`)
    .join(" + ");

  if (!left && !right) return "Reaction equation unavailable.";
  return `${left || "?"} -> ${right || "?"}`;
}

function buildOverallResidueRoles(residues) {
  const roles = [];

  for (const residue of residues || []) {
    const refChain = (residue.residue_chains || []).find((c) => c.is_reference) || residue.residue_chains?.[0];
    const residueLabel = refChain
      ? `${refChain.code}${refChain.auth_resid || refChain.resid || ""}${refChain.chain_name || ""}`
      : "Residue";
    const roleText = residue.roles_summary || "role not specified";
    roles.push(`${residueLabel}: ${roleText}`);
  }

  return [...new Set(roles)].slice(0, 12);
}

function getReferencePdbId(entry) {
  for (const residue of entry?.residues || []) {
    const refChain = (residue.residue_chains || []).find((c) => c.is_reference) || residue.residue_chains?.[0];
    if (refChain?.pdb_id) return refChain.pdb_id.toLowerCase();
  }
  return "";
}

function buildReactionImages(compounds) {
  const reactant = (compounds || []).find((c) => c.type === "reactant" && c.chebi_id);
  const product = (compounds || []).find((c) => c.type === "product" && c.chebi_id);
  if (!reactant || !product) return null;

  const reactantImage = `https://www.ebi.ac.uk/thornton-srv/m-csa/media/compound_images/${reactant.chebi_id}_NxkMYSC.png`;
  const productImage = `https://www.ebi.ac.uk/thornton-srv/m-csa/media/compound_images/${product.chebi_id}_SGvN4YB.png`;

  return { reactant: reactantImage, product: productImage };
}

function extractTextFromHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return doc.body.textContent.replace(/\s+/g, " ").trim();
}

function parseStepRolesFromEntryHtml(html, mechanismId, stepId) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const panel = doc.querySelector(`#mech${mechanismId}step${stepId}`);
  if (!panel) return [];

  const rows = panel.querySelectorAll("table tr");
  const roles = [];

  rows.forEach((row, idx) => {
    if (idx === 0) return;
    const cells = row.querySelectorAll("td");
    if (cells.length < 2) return;
    const residue = extractTextFromHtml(cells[0].innerHTML);
    const roleText = extractTextFromHtml(cells[1].innerHTML).replace(/\s+,/g, ",");
    if (!residue || !roleText) return;
    roles.push(`${residue}: ${roleText}`);
  });

  return roles;
}

function buildReactionsFromApi(results, stepRoleHtmlByEntry) {
  const built = [];

  for (const entry of results || []) {
    const mechanisms = entry?.reaction?.mechanisms || [];
    const detailed = mechanisms.find(
      (m) => m.is_detailed && Array.isArray(m.steps) && m.steps.length > 1,
    );

    if (!detailed) continue;

    const entryHtml = stepRoleHtmlByEntry.get(entry.mcsa_id) || "";
    const stepCards = detailed.steps
      .filter((s) => !s.is_product)
      .map((s) => ({
        type: "step",
        description: s.description || "No explanation available for this step.",
        figure: normalizeUrl(s.figure),
        roles: parseStepRolesFromEntryHtml(entryHtml, detailed.mechanism_id, s.step_id),
      }))
      .filter((s) => s.figure || s.description);

    if (stepCards.length < 2) continue;

    const pdbId = getReferencePdbId(entry);
    const structureImage = pdbId
      ? `https://cdn.rcsb.org/images/structures/${pdbId}_assembly-1.jpeg`
      : "";

    const reactionImages = buildReactionImages(entry?.reaction?.compounds);

    built.push({
      mcsaId: entry.mcsa_id,
      enzyme: entry.enzyme_name || "Unknown enzyme",
      ec: entry.all_ecs?.[0] || entry?.reaction?.ec || "EC unknown",
      intro: entry.description || "No introduction available.",
      reactionSummary: buildReactionEquation(entry?.reaction?.compounds),
      structureImage,
      roles: buildOverallResidueRoles(entry.residues),
      cards: [
        {
          type: "intro",
          description: detailed.mechanism_text || "No mechanism overview available.",
          roles: buildOverallResidueRoles(entry.residues),
          reactionImages,
        },
        ...stepCards,
      ],
    });
  }

  return built;
}

async function loadReactions() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("API request failed");
    const data = await res.json();

    const detailedEntries = (data.results || []).filter((entry) =>
      (entry?.reaction?.mechanisms || []).some((m) => m.is_detailed && Array.isArray(m.steps) && m.steps.length > 1),
    );

    const entryHtmlPairs = await Promise.all(
      detailedEntries.map(async (entry) => {
        try {
          const entryRes = await fetch(`https://www.ebi.ac.uk/thornton-srv/m-csa/entry/${entry.mcsa_id}/`);
          if (!entryRes.ok) return [entry.mcsa_id, ""];
          return [entry.mcsa_id, await entryRes.text()];
        } catch {
          return [entry.mcsa_id, ""];
        }
      }),
    );

    const stepRoleHtmlByEntry = new Map(entryHtmlPairs);
    const parsed = buildReactionsFromApi(data.results, stepRoleHtmlByEntry);

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

function currentCard() {
  return currentReaction().cards[stepIndex];
}

function renderRoles(roles) {
  rolesListEl.innerHTML = "";

  if (!roles || !roles.length) {
    const emptyRole = document.createElement("li");
    emptyRole.textContent = "No catalytic residue roles available for this card.";
    rolesListEl.appendChild(emptyRole);
    return;
  }

  for (const role of roles) {
    const item = document.createElement("li");
    item.textContent = role;
    rolesListEl.appendChild(item);
  }
}

function renderReactionVisual(card) {
  const hasReactionImages = !!card.reactionImages?.reactant && !!card.reactionImages?.product;

  if (!hasReactionImages) {
    reactantImageEl.removeAttribute("src");
    productImageEl.removeAttribute("src");
    reactionVisualEl.classList.add("hidden");
    return;
  }

  reactantImageEl.src = card.reactionImages.reactant;
  productImageEl.src = card.reactionImages.product;
  reactionVisualEl.classList.remove("hidden");
}

function render() {
  const reaction = currentReaction();
  const card = currentCard();
  const totalReactions = reactions.length;
  const totalCards = reaction.cards.length;
  const isIntroCard = card.type === "intro";

  reactionTitleEl.textContent = `Reaction ${reactionIndex + 1}/${totalReactions}: ${reaction.enzyme} (EC ${reaction.ec})`;
  stepMetaEl.textContent = `Card ${stepIndex + 1}/${totalCards}${isIntroCard ? " - Overview" : ""}`;
  explainMetaEl.textContent = isIntroCard ? "Protein Structure" : `Explanation for Card ${stepIndex + 1}/${totalCards}`;

  renderRoles(card.roles || reaction.roles);

  introSummaryEl.classList.toggle("hidden", !isIntroCard);
  if (isIntroCard) {
    introSummaryEl.textContent = `${reaction.intro} Reaction: ${reaction.reactionSummary}`;
  }

  if (card.figure) {
    stepImageEl.src = card.figure;
    stepImageEl.alt = "Mechanism step illustration";
    stepImageEl.classList.remove("hidden");
  } else {
    stepImageEl.removeAttribute("src");
    stepImageEl.classList.add("hidden");
  }

  if (isIntroCard) {
    renderReactionVisual(card);
  } else {
    reactionVisualEl.classList.add("hidden");
  }

  if (isIntroCard && reaction.structureImage) {
    structureImageEl.src = reaction.structureImage;
    structureImageEl.classList.remove("hidden");
    stepExplanationEl.textContent = "Reference protein structure.";
  } else {
    structureImageEl.removeAttribute("src");
    structureImageEl.classList.add("hidden");
    stepExplanationEl.textContent = card.description;
  }

  frontFaceEl.classList.toggle("hidden", isFlipped);
  backFaceEl.classList.toggle("hidden", !isFlipped);

  backBtn.disabled = stepIndex === 0;

  const finishedThisReaction = stepIndex >= totalCards - 1;
  nextReactionBtn.disabled = !finishedThisReaction;

  if (finishedThisReaction) {
    if (reactionIndex < totalReactions - 1) {
      statusEl.textContent = "Reaction complete. Tap 'Next Reaction' to continue.";
    } else {
      statusEl.textContent = "All loaded reactions complete. Refresh to restart.";
    }
  } else {
    statusEl.textContent = "Tap the card to move to the next card.";
  }
}

function goToNextStep() {
  const totalCards = currentReaction().cards.length;
  if (stepIndex < totalCards - 1) {
    stepIndex += 1;
    isFlipped = false;
    render();
  } else {
    render();
  }
}

function goToPreviousStep() {
  if (stepIndex > 0) {
    stepIndex -= 1;
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

backBtn.addEventListener("click", goToPreviousStep);
nextReactionBtn.addEventListener("click", goToNextReaction);

loadReactions();
