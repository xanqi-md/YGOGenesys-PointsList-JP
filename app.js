/**
 * Yu-Gi-Oh! Genesis Format Points
 * Pure Vanilla JavaScript Application
 * No build step required
 */

'use strict';

// ==========================================
// STATE
// ==========================================
const STATE = {
  cards: [],
  filteredCards: [],
  deckCards: [],
  savedDecks: [],
  currentDeckId: null,
  deckName: '新しいデッキ',
  pointLimit: 100,
  searchTerm: '',
  pointMin: 0,
  pointMax: 200,
  sortBy: 'points-desc',
  currentPage: 1,
  itemsPerPage: 20,
  deckChart: null,
  sortableInstances: {},
  selectedCard: null,
};

// ==========================================
// UTILITIES
// ==========================================
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getPointColor(points) {
  if (points >= 80) return '#ff3333';
  if (points >= 50) return '#ff9900';
  if (points >= 30) return '#ffcc00';
  if (points >= 10) return '#00cc66';
  return '#0066ff';
}

function getCardTypeBadgeClass(cardType) {
  const map = {
    spell: 'type-spell', trap: 'type-trap', synchro: 'type-synchro',
    fusion: 'type-fusion', xyz: 'type-xyz', ritual: 'type-ritual',
    link: 'type-link', pendulum: 'type-pendulum',
  };
  return map[cardType] || 'type-monster';
}

function getCardTypeLabel(cardType) {
  const map = {
    spell: '魔法', trap: '罠', synchro: 'シンクロ', fusion: '融合',
    xyz: 'エクシーズ', ritual: '儀式', link: 'リンク', pendulum: 'ペンデュラム',
  };
  return map[cardType] || 'モンスター';
}

function getRarityClass(rarity) {
  const map = { UR: 'rarity-UR', SR: 'rarity-SR', R: 'rarity-R', N: 'rarity-N' };
  return map[rarity] || 'rarity-N';
}

function translateRace(race, cardType) {
  if (!race) return '-';
  if (cardType === 'spell' || cardType === 'trap') {
    const typeMap = {
      Normal: '通常', Continuous: '永続', Equip: '装備', Field: 'フィールド',
      'Quick-Play': '速攻', Ritual: '儀式', Counter: 'カウンター',
    };
    return typeMap[race] || race;
  }
  const raceMap = {
    Dragon: 'ドラゴン族', Spellcaster: '魔法使い族', Zombie: 'アンデット族',
    Warrior: '戦士族', 'Beast-Warrior': '獣戦士族', Beast: '獣族',
    'Winged Beast': '鳥獣族', Fiend: '悪魔族', Fairy: '天使族',
    Insect: '昆虫族', Dinosaur: '恐竜族', Reptile: '爬虫類族', Fish: '魚族',
    'Sea Serpent': '海竜族', Machine: '機械族', Thunder: '雷族', Aqua: '水族',
    Pyro: '炎族', Rock: '岩石族', Plant: '植物族', Psychic: 'サイキック族',
    Wyrm: '幻竜族', Cyberse: 'サイバース族', 'Divine-Beast': '幻神獣族',
    'Creator-God': '創造神族',
  };
  return raceMap[race] || race;
}

function translateAttribute(attr) {
  if (!attr) return '-';
  const attrMap = {
    LIGHT: '光', DARK: '闇', WATER: '水', FIRE: '炎',
    EARTH: '地', WIND: '風', DIVINE: '神',
  };
  return attrMap[attr] || attr;
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==========================================
// TABS
// ==========================================
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${tab}`).classList.add('active');
      if (tab === 'deck') {
        updateDeckDisplay();
        updateChart();
      }
    });
  });
}

// ==========================================
// CARD DATA LOADING
// ==========================================
async function loadCards() {
  try {
    const response = await fetch('./cards_data.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    STATE.cards = await response.json();
    document.getElementById('footerInfo').textContent =
      `全${STATE.cards.length}枚のカード情報 | Genesis Format 2025`;
    applyFilters();
  } catch (err) {
    console.error('Failed to load cards:', err);
    document.getElementById('cardList').innerHTML =
      '<div class="loading-spinner"><p>⚠️ カードデータの読み込みに失敗しました</p><p style="font-size:0.8rem;margin-top:8px;">cards_data.json が必要です。管理APIで更新してください。</p></div>';
  }
}

// ==========================================
// SEARCH & FILTER
// ==========================================
function applyFilters() {
  const term = STATE.searchTerm.toLowerCase().trim();
  const min = STATE.pointMin;
  const max = STATE.pointMax;

  let result = STATE.cards.filter(card => {
    if (term.startsWith('archetype:')) {
      const target = term.replace('archetype:', '').trim();
      return card.archetype && card.archetype.toLowerCase().includes(target);
    }
    if (term.startsWith('race:')) {
      const target = term.replace('race:', '').trim();
      return card.race && card.race.toLowerCase().includes(target);
    }
    if (term.startsWith('attr:')) {
      const target = term.replace('attr:', '').trim();
      return card.attribute && card.attribute.toLowerCase().includes(target);
    }
    const matchName = !term || card.name.toLowerCase().includes(term);
    const matchPts = card.points >= min && card.points <= max;
    return matchName && matchPts;
  });

  if (STATE.sortBy === 'points-desc') result.sort((a, b) => b.points - a.points);
  else if (STATE.sortBy === 'points-asc') result.sort((a, b) => a.points - b.points);
  else if (STATE.sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name, 'ja'));

  STATE.filteredCards = result;
  STATE.currentPage = 1;
  document.getElementById('resultCount').textContent = `${result.length}件`;
  renderCardList();
  renderPagination();
}

// ==========================================
// CARD LIST RENDERING
// ==========================================
function renderCardList() {
  const container = document.getElementById('cardList');
  const start = (STATE.currentPage - 1) * STATE.itemsPerPage;
  const page = STATE.filteredCards.slice(start, start + STATE.itemsPerPage);

  if (page.length === 0) {
    container.innerHTML = '<div class="loading-spinner"><p>カードが見つかりません</p></div>';
    return;
  }

  container.innerHTML = page.map(card => renderCardItem(card)).join('');

  // Events
  container.querySelectorAll('.card-item').forEach(el => {
    const id = parseInt(el.dataset.id);
    el.addEventListener('click', (e) => {
      if (!e.target.classList.contains('add-btn')) {
        const card = STATE.cards.find(c => c.id === id);
        if (card) openCardModal(card);
      }
    });
  });
  container.querySelectorAll('.add-btn[data-action="main"]').forEach(el => {
    const id = parseInt(el.dataset.id);
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = STATE.cards.find(c => c.id === id);
      if (card) addCardToMainOrEx(card);
    });
  });
  container.querySelectorAll('.add-btn[data-action="side"]').forEach(el => {
    const id = parseInt(el.dataset.id);
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = STATE.cards.find(c => c.id === id);
      if (card) addCardToSection(card, 'side');
    });
  });
}

function renderCardItem(card) {
  const imageUrl = card.konami_id
    ? `https://images.ygoprodeck.com/images/cards_small/${card.konami_id}.jpg` : null;
  const ptColor = getPointColor(card.points);
  const typeBadge = getCardTypeBadgeClass(card.cardType);
  const typeLabel = getCardTypeLabel(card.cardType);
  const rarityClass = getRarityClass(card.rarity);
  const forbiddenClass = card.isForbidden ? 'forbidden' : '';

  return `
    <div class="card-item" data-id="${card.id}" draggable="true">
      <div class="card-thumb-wrap">
        ${imageUrl
          ? `<img class="card-thumb" src="${imageUrl}" alt="${escapeHtml(card.name)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\"card-thumb-placeholder\\">No Image</div>'">`
          : '<div class="card-thumb-placeholder">No Image</div>'}
      </div>
      <div class="card-info">
        <div class="card-name ${forbiddenClass}">${escapeHtml(card.name)}</div>
        <div class="card-meta">
          <span class="type-badge ${typeBadge}">${typeLabel}</span>
          ${card.rarity ? `<span class="rarity-label ${rarityClass}">${card.rarity}</span>` : ''}
          ${card.isForbidden ? '<span style="font-size:0.65rem;color:#e74c3c;font-weight:700;">禁止</span>' : ''}
        </div>
      </div>
      <div class="points-circle" style="background:${ptColor}">${card.points}</div>
      <div class="card-add-btns">
        <button class="add-btn" data-id="${card.id}" data-action="main">+メイン</button>
        <button class="add-btn side" data-id="${card.id}" data-action="side">+サイド</button>
      </div>
    </div>
  `;
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
             .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ==========================================
// PAGINATION
// ==========================================
function renderPagination() {
  const container = document.getElementById('pagination');
  const total = Math.ceil(STATE.filteredCards.length / STATE.itemsPerPage);
  const cur = STATE.currentPage;

  if (total <= 1) { container.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="changePage(${cur - 1})" ${cur <= 1 ? 'disabled' : ''}>‹</button>`;

  const range = [];
  for (let i = Math.max(1, cur - 2); i <= Math.min(total, cur + 2); i++) range.push(i);
  if (range[0] > 1) { html += `<button class="page-btn" onclick="changePage(1)">1</button>`; if (range[0] > 2) html += `<span class="page-info">...</span>`; }
  range.forEach(p => { html += `<button class="page-btn ${p === cur ? 'active' : ''}" onclick="changePage(${p})">${p}</button>`; });
  if (range[range.length - 1] < total) { if (range[range.length - 1] < total - 1) html += `<span class="page-info">...</span>`; html += `<button class="page-btn" onclick="changePage(${total})">${total}</button>`; }

  html += `<button class="page-btn" onclick="changePage(${cur + 1})" ${cur >= total ? 'disabled' : ''}>›</button>`;
  html += `<span class="page-info">${cur} / ${total}</span>`;
  container.innerHTML = html;
}

function changePage(page) {
  const total = Math.ceil(STATE.filteredCards.length / STATE.itemsPerPage);
  if (page < 1 || page > total) return;
  STATE.currentPage = page;
  renderCardList();
  renderPagination();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.changePage = changePage;

// ==========================================
// DECK MANAGEMENT
// ==========================================
function loadDecksFromStorage() {
  try {
    const saved = localStorage.getItem('genesis_decks');
    if (saved) {
      STATE.savedDecks = JSON.parse(saved);
      if (STATE.savedDecks.length > 0) {
        loadDeck(STATE.savedDecks[0]);
      }
    } else {
      createNewDeck();
    }
  } catch (e) {
    console.error('Failed to load decks:', e);
    createNewDeck();
  }
}

function saveDecksToStorage(decks) {
  localStorage.setItem('genesis_decks', JSON.stringify(decks));
  STATE.savedDecks = decks;
  renderDeckTabs();
}

function createNewDeck() {
  if (STATE.savedDecks.length >= 5) {
    showToast('デッキは最大5つまでしか作成できません', 'error');
    return;
  }
  const newDeck = {
    id: generateId(),
    name: `デッキ ${STATE.savedDecks.length + 1}`,
    cards: [],
    pointLimit: 100,
    updatedAt: Date.now(),
  };
  const newDecks = [...STATE.savedDecks, newDeck];
  saveDecksToStorage(newDecks);
  loadDeck(newDeck);
  showToast('新しいデッキを作成しました', 'success');
}

function loadDeck(deck) {
  STATE.currentDeckId = deck.id;
  STATE.deckName = deck.name;
  STATE.deckCards = [...deck.cards];
  STATE.pointLimit = deck.pointLimit || 100;
  document.getElementById('deckNameInput').value = deck.name;
  document.getElementById('pointLimitSelect').value = deck.pointLimit || 100;
  renderDeckTabs();
  updateDeckDisplay();
  updateChart();
}

function saveCurrentDeck() {
  if (!STATE.currentDeckId) return;
  const updatedDecks = STATE.savedDecks.map(d => {
    if (d.id === STATE.currentDeckId) {
      return { ...d, name: STATE.deckName, cards: STATE.deckCards, pointLimit: STATE.pointLimit, updatedAt: Date.now() };
    }
    return d;
  });
  saveDecksToStorage(updatedDecks);
  showToast('デッキを保存しました', 'success');
}

function deleteDeck(id) {
  if (STATE.savedDecks.length <= 1) {
    showToast('最後のデッキは削除できません', 'error');
    return;
  }
  if (!confirm('本当にこのデッキを削除しますか？')) return;
  const newDecks = STATE.savedDecks.filter(d => d.id !== id);
  saveDecksToStorage(newDecks);
  if (STATE.currentDeckId === id) loadDeck(newDecks[0]);
  showToast('デッキを削除しました', 'success');
}

function renderDeckTabs() {
  const container = document.getElementById('deckTabsRow');
  container.innerHTML = STATE.savedDecks.map(deck =>
    `<button class="deck-tab ${deck.id === STATE.currentDeckId ? 'active' : ''}" onclick="loadDeck(STATE.savedDecks.find(d=>d.id==='${deck.id}'))">${escapeHtml(deck.name)}</button>`
  ).join('');
}

// ==========================================
// ADD / REMOVE CARDS
// ==========================================
function addCardToMainOrEx(card) {
  const isExCard = ['synchro', 'fusion', 'xyz', 'link'].includes(card.cardType || '');
  addCardToSection(card, isExCard ? 'ex' : 'main');
}

function addCardToSection(card, section) {
  if (card.isForbidden) {
    showToast('禁止カードはデッキに入れられません', 'error');
    return;
  }
  const copies = STATE.deckCards.filter(dc => dc.cardId === card.id).length;
  if (copies >= 3) {
    showToast('同名カードは3枚までです', 'error');
    return;
  }
  const sectionCount = STATE.deckCards.filter(dc => dc.section === section).length;
  if (section === 'main' && sectionCount >= 60) {
    showToast('メインデッキは60枚までです', 'error'); return;
  }
  if ((section === 'ex' || section === 'side') && sectionCount >= 15) {
    showToast(`${section === 'ex' ? 'EX' : 'サイド'}デッキは15枚までです`, 'error'); return;
  }

  const newCard = {
    id: `${card.id}-${generateId()}`,
    cardId: card.id,
    name: card.name,
    points: card.points,
    section: section,
    cardType: card.cardType,
    konami_id: card.konami_id,
    desc: card.desc,
    attribute: card.attribute,
    level: card.level,
    atk: card.atk,
    def: card.def,
    race: card.race,
    rarity: card.rarity,
    archetype: card.archetype,
  };

  STATE.deckCards.push(newCard);
  autoSaveDeck();
  updateDeckDisplay();
  updateChart();
  showToast(`${card.name}を追加しました`, 'success');
}

function removeCardFromDeck(id) {
  STATE.deckCards = STATE.deckCards.filter(dc => dc.id !== id);
  autoSaveDeck();
  updateDeckDisplay();
  updateChart();
}

function autoSaveDeck() {
  if (!STATE.currentDeckId) return;
  const updatedDecks = STATE.savedDecks.map(d => {
    if (d.id === STATE.currentDeckId) {
      return { ...d, cards: STATE.deckCards, pointLimit: STATE.pointLimit, updatedAt: Date.now() };
    }
    return d;
  });
  saveDecksToStorage(updatedDecks);
}

// ==========================================
// DECK STATS
// ==========================================
function getDeckStats() {
  const main = STATE.deckCards.filter(dc => dc.section === 'main');
  const ex = STATE.deckCards.filter(dc => dc.section === 'ex');
  const side = STATE.deckCards.filter(dc => dc.section === 'side');
  const totalPoints = STATE.deckCards.reduce((sum, dc) => sum + dc.points, 0);
  return {
    mainCount: main.length, exCount: ex.length, sideCount: side.length,
    totalPoints,
    pointsValid: totalPoints <= STATE.pointLimit,
    mainCountValid: main.length >= 40 && main.length <= 60,
    exCountValid: ex.length <= 15,
    sideCountValid: side.length <= 15,
    monsterCount: main.filter(c => !['spell', 'trap'].includes(c.cardType || '')).length,
    spellCount: main.filter(c => c.cardType === 'spell').length,
    trapCount: main.filter(c => c.cardType === 'trap').length,
  };
}

// ==========================================
// DECK DISPLAY
// ==========================================
function updateDeckDisplay() {
  const stats = getDeckStats();

  // Stats bar
  const statMain = document.getElementById('statMain');
  const statEx = document.getElementById('statEx');
  const statSide = document.getElementById('statSide');
  const statPoints = document.getElementById('statPoints');

  statMain.textContent = `メイン: ${stats.mainCount} (40-60)`;
  statMain.className = `stat-badge ${stats.mainCountValid ? 'green' : 'red'}`;
  statEx.textContent = `EX: ${stats.exCount} (0-15)`;
  statEx.className = `stat-badge ${stats.exCountValid ? 'green' : 'red'}`;
  statSide.textContent = `サイド: ${stats.sideCount} (0-15)`;
  statSide.className = `stat-badge ${stats.sideCountValid ? 'green' : 'red'}`;
  statPoints.textContent = `合計: ${stats.totalPoints} / ${STATE.pointLimit} pt`;
  statPoints.className = `stat-badge ${stats.pointsValid ? 'green' : 'red'}`;

  // Section counts
  document.getElementById('mainCount').textContent = `${stats.mainCount}枚 (40-60)`;
  document.getElementById('mainCount').className = `section-count ${stats.mainCountValid ? 'green' : 'red'}`;
  document.getElementById('exCount').textContent = `${stats.exCount}枚 (0-15)`;
  document.getElementById('exCount').className = `section-count ${stats.exCountValid ? 'green' : 'red'}`;
  document.getElementById('sideCount').textContent = `${stats.sideCount}枚 (0-15)`;
  document.getElementById('sideCount').className = `section-count ${stats.sideCountValid ? 'green' : 'red'}`;

  // Render each section
  renderSectionGrid('main');
  renderSectionGrid('ex');
  renderSectionGrid('side');

  // Re-initialize sortable after render
  initSortable();
}

function renderSectionGrid(section) {
  const grid = document.getElementById(`${section}-grid`);
  const cards = STATE.deckCards.filter(dc => dc.section === section);

  if (cards.length === 0) {
    grid.innerHTML = '<div class="drop-hint">カードをドラッグして追加</div>';
    return;
  }

  grid.innerHTML = cards.map(card => renderDeckCard(card)).join('');

  // Remove button events
  grid.querySelectorAll('.deck-card-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeCardFromDeck(btn.dataset.id);
    });
  });

  // Click to open modal
  grid.querySelectorAll('.deck-card').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.classList.contains('deck-card-remove')) return;
      const id = el.dataset.id;
      const dc = STATE.deckCards.find(c => c.id === id);
      if (dc) openCardModalFromDeck(dc);
    });
  });
}

function renderDeckCard(card) {
  const imageUrl = card.konami_id
    ? `https://images.ygoprodeck.com/images/cards_small/${card.konami_id}.jpg` : null;

  return `
    <div class="deck-card" data-id="${card.id}" data-section="${card.section}">
      <div class="deck-card-img-wrap">
        ${imageUrl
          ? `<img class="deck-card-img" src="${imageUrl}" alt="${escapeHtml(card.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          : ''}
        <div class="deck-card-no-img" style="${imageUrl ? 'display:none' : ''}">No Image</div>
        <div class="deck-card-pts">${card.points}pt</div>
      </div>
      <div class="deck-card-name">${escapeHtml(card.name)}</div>
      <button class="deck-card-remove" data-id="${card.id}" title="削除">✕</button>
    </div>
  `;
}

// ==========================================
// DRAG & DROP (SortableJS)
// ==========================================
function initSortable() {
  ['main', 'ex', 'side'].forEach(section => {
    const grid = document.getElementById(`${section}-grid`);
    if (!grid) return;

    // Destroy existing instance
    if (STATE.sortableInstances[section]) {
      STATE.sortableInstances[section].destroy();
    }

    // Skip if only has drop-hint
    if (grid.querySelector('.drop-hint')) return;

    STATE.sortableInstances[section] = Sortable.create(grid, {
      group: 'deck',
      animation: 150,
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      handle: '.deck-card',
      onEnd(evt) {
        const fromSection = evt.from.dataset.section;
        const toSection = evt.to.dataset.section;
        const cardId = evt.item.dataset.id;

        if (fromSection === toSection) {
          // Reorder within section
          const sectionCards = STATE.deckCards.filter(c => c.section === section);
          const otherCards = STATE.deckCards.filter(c => c.section !== section);
          const moved = sectionCards.splice(evt.oldIndex, 1)[0];
          sectionCards.splice(evt.newIndex, 0, moved);
          STATE.deckCards = [...otherCards, ...sectionCards];
        } else {
          // Move to different section
          const card = STATE.deckCards.find(c => c.id === cardId);
          if (!card) return;

          const isExCard = ['synchro', 'fusion', 'xyz', 'link'].includes(card.cardType || '');
          if (toSection === 'ex' && !isExCard) {
            showToast('EXデッキにはEXモンスターしか入れられません', 'error');
            updateDeckDisplay(); return;
          }
          if (toSection === 'main' && isExCard) {
            showToast('メインデッキにはEXモンスターを入れられません', 'error');
            updateDeckDisplay(); return;
          }

          const sectionCount = STATE.deckCards.filter(c => c.section === toSection).length;
          if (toSection === 'main' && sectionCount >= 60) {
            showToast('メインデッキは60枚までです', 'error');
            updateDeckDisplay(); return;
          }
          if ((toSection === 'ex' || toSection === 'side') && sectionCount >= 15) {
            showToast(`${toSection === 'ex' ? 'EX' : 'サイド'}デッキは15枚までです`, 'error');
            updateDeckDisplay(); return;
          }
          card.section = toSection;
        }

        autoSaveDeck();
        updateDeckDisplay();
        updateChart();
      }
    });
  });
}

// ==========================================
// CHART
// ==========================================
function updateChart() {
  const stats = getDeckStats();
  const ctx = document.getElementById('deckChart').getContext('2d');

  const chartData = [
    { name: 'モンスター', value: stats.monsterCount, color: '#d97706' },
    { name: '魔法', value: stats.spellCount, color: '#16a34a' },
    { name: '罠', value: stats.trapCount, color: '#c026d3' },
  ].filter(d => d.value > 0);

  if (STATE.deckChart) {
    STATE.deckChart.destroy();
    STATE.deckChart = null;
  }

  if (chartData.length === 0) {
    document.getElementById('chartLegend').innerHTML = '<p style="font-size:0.75rem;color:var(--text-dim)">データなし</p>';
    return;
  }

  STATE.deckChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: chartData.map(d => d.name),
      datasets: [{
        data: chartData.map(d => d.value),
        backgroundColor: chartData.map(d => d.color),
        borderWidth: 0,
        hoverOffset: 4,
      }],
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.raw}枚`,
          },
          backgroundColor: '#1a1a1a',
          borderColor: '#333',
          borderWidth: 1,
        },
      },
    },
  });

  document.getElementById('chartLegend').innerHTML = chartData.map(d =>
    `<div class="legend-item"><div class="legend-dot" style="background:${d.color}"></div><span>${d.name}: ${d.value}枚</span></div>`
  ).join('');
}

// ==========================================
// EXPORT / IMPORT
// ==========================================
function exportYDK() {
  let content = '#created by Genesis Points Builder\n#main\n';
  STATE.deckCards.filter(c => c.section === 'main' && c.konami_id).forEach(c => {
    content += `${c.konami_id}\n`;
  });
  content += '#extra\n';
  STATE.deckCards.filter(c => c.section === 'ex' && c.konami_id).forEach(c => {
    content += `${c.konami_id}\n`;
  });
  content += '!side\n';
  STATE.deckCards.filter(c => c.section === 'side' && c.konami_id).forEach(c => {
    content += `${c.konami_id}\n`;
  });

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${STATE.deckName}.ydk`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('YDKファイルをダウンロードしました', 'success');
}

function importYDK(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const text = ev.target.result;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#created'));
    let currentSection = 'main';
    const newDeck = [];
    const notFound = [];

    for (const line of lines) {
      if (line === '#main') { currentSection = 'main'; continue; }
      if (line === '#extra') { currentSection = 'ex'; continue; }
      if (line === '!side') { currentSection = 'side'; continue; }
      if (line.startsWith('#')) continue;

      const konamiId = parseInt(line);
      if (isNaN(konamiId)) continue;

      const card = STATE.cards.find(c => c.konami_id === konamiId);
      if (card) {
        newDeck.push({
          id: `${card.id}-${generateId()}`,
          cardId: card.id, name: card.name, points: card.points,
          section: currentSection, cardType: card.cardType, konami_id: card.konami_id,
          desc: card.desc, attribute: card.attribute, level: card.level,
          atk: card.atk, def: card.def, race: card.race, rarity: card.rarity, archetype: card.archetype,
        });
      } else {
        notFound.push(line);
      }
    }

    STATE.deckCards = newDeck;
    autoSaveDeck();
    updateDeckDisplay();
    updateChart();

    if (notFound.length > 0) {
      showToast(`${notFound.length}枚のカードが見つかりませんでした`, 'warning');
    } else {
      showToast('デッキを読み込みました', 'success');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

async function exportPDF() {
  const stats = getDeckStats();
  const deckName = STATE.deckName;

  showToast('PDFを生成中...', 'info');

  // Build hidden PDF content
  const pdfContent = document.getElementById('pdfContent');
  document.getElementById('pdfTitle').textContent = deckName;
  document.getElementById('pdfPoints').textContent =
    `Genesis Format Points: ${stats.totalPoints} / ${STATE.pointLimit}`;

  const makeTable = (section, title, color) => {
    const cards = STATE.deckCards.filter(c => c.section === section);
    if (cards.length === 0) return '';
    return `
      <div style="margin-bottom:20px;">
        <h2 style="font-size:18px;font-weight:bold;border-bottom:2px solid ${color};padding-bottom:5px;margin-bottom:10px;">
          ${title} (${cards.length}枚)
        </h2>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="background:#f0f0f0;">
            <th style="border:1px solid #ddd;padding:8px;text-align:left;">カード名</th>
            <th style="border:1px solid #ddd;padding:8px;text-align:center;width:80px;">ポイント</th>
            <th style="border:1px solid #ddd;padding:8px;text-align:center;width:60px;">レアリティ</th>
          </tr></thead>
          <tbody>
            ${cards.map(card => `
              <tr>
                <td style="border:1px solid #ddd;padding:8px;">${card.name}</td>
                <td style="border:1px solid #ddd;padding:8px;text-align:center;">${card.points}</td>
                <td style="border:1px solid #ddd;padding:8px;text-align:center;">${card.rarity || 'N'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  };

  document.getElementById('pdfMainTable').innerHTML = makeTable('main', 'メインデッキ', '#16a34a');
  document.getElementById('pdfExTable').innerHTML = makeTable('ex', 'EXデッキ', '#9333ea');
  document.getElementById('pdfSideTable').innerHTML = makeTable('side', 'サイドデッキ', '#eab308');

  pdfContent.style.display = 'block';

  try {
    const canvas = await html2canvas(pdfContent, { scale: 2, backgroundColor: '#ffffff' });
    pdfContent.style.display = 'none';

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let y = 0;
    const pageHeight = 297;
    while (y < imgHeight) {
      if (y > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, -y, imgWidth, imgHeight);
      y += pageHeight;
    }

    pdf.save(`${deckName}.pdf`);
    showToast('PDFを保存しました', 'success');
  } catch (err) {
    pdfContent.style.display = 'none';
    console.error('PDF export failed:', err);
    showToast('PDFの生成に失敗しました', 'error');
  }
}

// ==========================================
// CARD DETAIL MODAL
// ==========================================
function openCardModal(card) {
  STATE.selectedCard = card;

  document.getElementById('modalCardName').textContent = card.name;

  const pointsBadge = document.getElementById('modalPoints');
  pointsBadge.textContent = `${card.points}pt`;
  pointsBadge.style.background = getPointColor(card.points);

  document.getElementById('modalRarity').textContent = card.rarity || '';
  document.getElementById('modalRarity').className = `rarity-badge ${getRarityClass(card.rarity)}`;

  // Image
  const img = document.getElementById('modalCardImage');
  if (card.konami_id) {
    img.src = `https://images.ygoprodeck.com/images/cards/${card.konami_id}.jpg`;
    img.style.display = 'block';
    img.onerror = () => { img.style.display = 'none'; };
  } else {
    img.style.display = 'none';
  }

  // Info grid
  const infoGrid = document.getElementById('modalInfoGrid');
  const infos = [];

  if (card.attribute) {
    infos.push({ label: '属性 (クリックで検索)', value: translateAttribute(card.attribute), clickable: true, action: () => searchByRelated('attr', card.attribute) });
  }
  if (card.level) {
    infos.push({ label: 'レベル/ランク', value: `★ ${card.level}`, clickable: false });
  }
  if (card.race) {
    const isSpellTrap = card.cardType === 'spell' || card.cardType === 'trap';
    infos.push({ label: `${isSpellTrap ? '種類' : '種族'} (クリックで検索)`, value: translateRace(card.race, card.cardType), clickable: true, action: () => searchByRelated('race', card.race) });
  }
  if (card.atk !== undefined && card.atk !== null) {
    infos.push({ label: '攻撃力 / 守備力', value: `${card.atk} / ${card.def ?? '?'}`, clickable: false });
  }
  if (card.archetype) {
    infos.push({ label: 'テーマ (クリックで検索)', value: card.archetype, clickable: true, action: () => searchByRelated('archetype', card.archetype) });
  }

  infoGrid.innerHTML = infos.map((info, i) =>
    `<div class="info-item ${info.clickable ? 'clickable' : ''}" data-info-idx="${i}">
      <span class="info-label">${info.label}</span>
      <span class="info-value">${info.value}</span>
    </div>`
  ).join('');

  infoGrid.querySelectorAll('.info-item.clickable').forEach(el => {
    const idx = parseInt(el.dataset.infoIdx);
    el.addEventListener('click', infos[idx].action);
  });

  // Description
  document.getElementById('modalDesc').textContent = card.desc || '効果テキストがありません';

  // Add buttons
  document.getElementById('modalAddMain').onclick = () => {
    addCardToMainOrEx(card);
    closeModal();
  };
  document.getElementById('modalAddSide').onclick = () => {
    addCardToSection(card, 'side');
    closeModal();
  };

  document.getElementById('cardModal').classList.add('open');
}

function openCardModalFromDeck(dc) {
  // Convert DeckCard to CardData-like for display
  const cardData = STATE.cards.find(c => c.id === dc.cardId) || dc;
  openCardModal(cardData);

  // Override buttons for deck card (no add buttons needed, or add more)
  document.getElementById('modalAddMain').onclick = () => {
    addCardToMainOrEx(cardData);
    closeModal();
  };
  document.getElementById('modalAddSide').onclick = () => {
    addCardToSection(cardData, 'side');
    closeModal();
  };
}

function closeModal() {
  document.getElementById('cardModal').classList.remove('open');
  STATE.selectedCard = null;
}

// ==========================================
// SEARCH BY RELATED (from modal)
// ==========================================
function searchByRelated(type, value) {
  let query = '';
  if (type === 'archetype') query = `archetype:${value}`;
  if (type === 'race') query = `race:${value}`;
  if (type === 'attr') query = `attr:${value}`;

  document.getElementById('searchInput').value = query;
  STATE.searchTerm = query;
  STATE.currentPage = 1;
  applyFilters();
  closeModal();

  // Switch to card list tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector('[data-tab="list"]').classList.add('active');
  document.getElementById('tab-list').classList.add('active');

  showToast(`${value} で検索しました`, 'info');
}

// ==========================================
// INIT EVENTS
// ==========================================
function initEvents() {
  // Search
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', () => {
    STATE.searchTerm = searchInput.value;
    STATE.currentPage = 1;
    applyFilters();
  });

  document.getElementById('clearSearch').addEventListener('click', () => {
    searchInput.value = '';
    STATE.searchTerm = '';
    STATE.currentPage = 1;
    applyFilters();
  });

  // Sort
  document.getElementById('sortSelect').addEventListener('change', (e) => {
    STATE.sortBy = e.target.value;
    applyFilters();
  });

  // Point filter
  document.getElementById('pointMin').addEventListener('input', (e) => {
    STATE.pointMin = parseInt(e.target.value) || 0;
    applyFilters();
  });
  document.getElementById('pointMax').addEventListener('input', (e) => {
    STATE.pointMax = parseInt(e.target.value) || 200;
    applyFilters();
  });

  // Deck controls
  document.getElementById('deckNameInput').addEventListener('input', (e) => {
    STATE.deckName = e.target.value;
  });
  document.getElementById('saveDeckBtn').addEventListener('click', saveCurrentDeck);
  document.getElementById('deleteDeckBtn').addEventListener('click', () => {
    if (STATE.currentDeckId) deleteDeck(STATE.currentDeckId);
  });
  document.getElementById('newDeckBtn').addEventListener('click', createNewDeck);

  // Point limit
  document.getElementById('pointLimitSelect').addEventListener('change', (e) => {
    STATE.pointLimit = parseInt(e.target.value);
    autoSaveDeck();
    updateDeckDisplay();
    updateChart();
  });

  // Export/Import
  document.getElementById('exportYdkBtn').addEventListener('click', exportYDK);
  document.getElementById('exportPdfBtn').addEventListener('click', exportPDF);
  document.getElementById('importYdkInput').addEventListener('change', importYDK);

  // Modal close
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('cardModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

// ==========================================
// MAIN INIT
// ==========================================
async function init() {
  initTabs();
  initEvents();
  loadDecksFromStorage();
  await loadCards();
}

document.addEventListener('DOMContentLoaded', init);
