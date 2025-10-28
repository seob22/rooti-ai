const calendarTitle = document.getElementById('calendar-title');
const calendarGrid = document.querySelector('.calendar__grid');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');

const startPauseBtn = document.getElementById('startPauseBtn');
const resetBtn = document.getElementById('resetBtn');
const logBtn = document.getElementById('logBtn');
const timerDisplay = document.querySelector('.timer__display');
const logList = document.getElementById('logList');
const appLogo = document.getElementById('appLogo');
const footerProfileBadge = document.getElementById('footerProfileBadge');

const LOGO_PATH = '../asset/logo.png';

if (appLogo) {
  appLogo.src = LOGO_PATH;
  appLogo.alt = 'ROOTI 로고';
}

if (footerProfileBadge) {
  const navigateToMyPage = () => {
    window.location.href = './mypage.html';
  };

  footerProfileBadge.addEventListener('click', navigateToMyPage);
  footerProfileBadge.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigateToMyPage();
    }
  });
}

const routineForm = document.getElementById('routineForm');
const segmentTypeSelect = document.getElementById('segmentType');
const segmentMinutesInput = document.getElementById('segmentMinutes');
const routineList = document.getElementById('routineList');
const clearRoutineBtn = document.getElementById('clearRoutineBtn');
const currentSegmentLabel = document.getElementById('currentSegmentLabel');

const pauseOverlay = document.getElementById('pauseOverlay');
const pauseOptionButtons = pauseOverlay.querySelectorAll('.pause-option');
const customPauseForm = document.getElementById('customPauseForm');
const customPauseInput = document.getElementById('customPauseInput');
const closePauseModalBtn = document.getElementById('closePauseModal');

let currentDate = new Date();
let timerInterval = null;
let elapsedSeconds = 0;
let isRunning = false;

const routineSegments = [];
let routineActive = false;
let routineCompleted = false;
let currentSegmentIndex = -1;
let segmentRemainingSeconds = 0;
let lastFocusedElement = null;

const WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function padNumber(value) {
  return value.toString().padStart(2, '0');
}

function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${padNumber(hrs)}:${padNumber(mins)}:${padNumber(secs)}`;
}

function formatTimestamp(date) {
  return `${date.getMonth() + 1}/${padNumber(date.getDate())} ${padNumber(
    date.getHours(),
  )}:${padNumber(date.getMinutes())}`;
}

function renderCalendar(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  calendarTitle.textContent = `${year}년 ${month + 1}월`;

  calendarGrid.innerHTML = '';

  WEEK_LABELS.forEach((label) => {
    const labelCell = document.createElement('div');
    labelCell.textContent = label;
    labelCell.classList.add('calendar__day', 'calendar__day--label');
    calendarGrid.appendChild(labelCell);
  });

  const startIndex = firstDay.getDay();

  for (let i = 0; i < startIndex; i += 1) {
    const emptyCell = document.createElement('div');
    emptyCell.classList.add('calendar__day');
    emptyCell.setAttribute('aria-hidden', 'true');
    calendarGrid.appendChild(emptyCell);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const dayCell = document.createElement('div');
    dayCell.textContent = day;
    dayCell.classList.add('calendar__day');

    const today = new Date();
    const isToday =
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear();

    if (isToday) {
      dayCell.classList.add('calendar__day--today');
      dayCell.setAttribute('aria-current', 'date');
    }

    calendarGrid.appendChild(dayCell);
  }
}

function getSegmentLabel(segment) {
  return segment.type === 'study' ? '공부' : '휴식';
}

function updateRoutineHighlight() {
  const items = routineList.querySelectorAll('.routine__item');
  items.forEach((item, index) => {
    const isActive = routineActive && index === currentSegmentIndex;
    item.classList.toggle('routine__item--active', isActive);
  });
}

function updateRoutineStatus() {
  if (routineSegments.length === 0) {
    currentSegmentLabel.textContent = '루틴이 설정되어 있지 않습니다.';
    return;
  }

  if (routineCompleted) {
    currentSegmentLabel.textContent =
      '루틴이 모두 완료되었습니다. 다시 시작하려면 시작 버튼을 눌러주세요.';
    return;
  }

  if (!routineActive) {
    const nextSegment = routineSegments[0];
    currentSegmentLabel.textContent = `${getSegmentLabel(nextSegment)} 준비 완료`;
    return;
  }

  if (currentSegmentIndex >= 0 && currentSegmentIndex < routineSegments.length) {
    const segment = routineSegments[currentSegmentIndex];
    const remainingMinutes = Math.ceil(segmentRemainingSeconds / 60);
    const statusText = isRunning ? '진행 중' : '일시정지됨';
    currentSegmentLabel.textContent = `${getSegmentLabel(
      segment,
    )} ${statusText} · 남은 ${remainingMinutes}분`;
  }
}

function syncRoutineControls() {
  const disableEditing = isRunning;
  segmentTypeSelect.disabled = disableEditing;
  segmentMinutesInput.disabled = disableEditing;
  const addButton = routineForm.querySelector('.routine__add');
  if (addButton) {
    addButton.disabled = disableEditing;
  }
  clearRoutineBtn.disabled = routineSegments.length === 0 || disableEditing;

  routineList.querySelectorAll('.routine__remove').forEach((btn) => {
    btn.disabled = disableEditing;
  });
}

function renderRoutineList() {
  routineList.innerHTML = '';

  if (routineSegments.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.classList.add('routine__empty');
    emptyItem.textContent = '추가된 루틴이 없습니다. 구간을 추가해 시작해보세요.';
    routineList.appendChild(emptyItem);
    updateRoutineStatus();
    syncRoutineControls();
    return;
  }

  routineSegments.forEach((segment, index) => {
    const item = document.createElement('li');
    item.classList.add('routine__item');

    const info = document.createElement('div');
    info.classList.add('routine__item-info');

    const badge = document.createElement('span');
    badge.classList.add(
      'routine__badge',
      segment.type === 'study' ? 'routine__badge--study' : 'routine__badge--break',
    );
    badge.textContent = getSegmentLabel(segment);

    const duration = document.createElement('span');
    duration.classList.add('routine__duration');
    duration.textContent = `${segment.minutes}분`;

    info.appendChild(badge);
    info.appendChild(duration);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.classList.add('routine__remove');
    removeBtn.textContent = '삭제';
    removeBtn.addEventListener('click', () => {
      removeRoutineSegment(index);
    });

    item.appendChild(info);
    item.appendChild(removeBtn);
    routineList.appendChild(item);
  });

  updateRoutineHighlight();
  updateRoutineStatus();
  syncRoutineControls();
}

function resetRoutineState() {
  routineActive = false;
  routineCompleted = false;
  currentSegmentIndex = -1;
  segmentRemainingSeconds = 0;
  updateRoutineHighlight();
  updateRoutineStatus();
}

function addRoutineSegment(event) {
  event.preventDefault();
  const minutes = Number.parseInt(segmentMinutesInput.value, 10);
  if (Number.isNaN(minutes) || minutes <= 0) {
    segmentMinutesInput.focus();
    return;
  }

  routineSegments.push({
    type: segmentTypeSelect.value,
    minutes,
  });

  if (!isRunning) {
    resetRoutineState();
  }

  routineCompleted = false;
  renderRoutineList();

  if (segmentTypeSelect.value === 'study') {
    segmentMinutesInput.value = '50';
  } else {
    segmentMinutesInput.value = '10';
  }
}

function removeRoutineSegment(index) {
  if (isRunning || index < 0 || index >= routineSegments.length) {
    return;
  }

  routineSegments.splice(index, 1);

  if (routineSegments.length === 0) {
    resetRoutineState();
  } else {
    routineCompleted = false;
    routineActive = false;
    currentSegmentIndex = -1;
    segmentRemainingSeconds = 0;
  }

  renderRoutineList();
}

function clearRoutine() {
  if (isRunning || routineSegments.length === 0) {
    return;
  }

  routineSegments.length = 0;
  resetRoutineState();
  renderRoutineList();
}

function handleSegmentCompletion() {
  const completedSegment = routineSegments[currentSegmentIndex];
  logRoutineSegment(completedSegment);

  currentSegmentIndex += 1;

  if (currentSegmentIndex >= routineSegments.length) {
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
    routineActive = false;
    routineCompleted = true;
    currentSegmentIndex = -1;
    segmentRemainingSeconds = 0;
    startPauseBtn.textContent = '시작';
    timerDisplay.textContent = '00:00:00';
    updateRoutineHighlight();
    updateRoutineStatus();
    syncRoutineControls();
    return;
  }

  segmentRemainingSeconds = routineSegments[currentSegmentIndex].minutes * 60;
  updateRoutineHighlight();
  updateRoutineStatus();
}

function startTimer() {
  if (isRunning) {
    return;
  }

  if (routineSegments.length > 0) {
    if (!routineActive || routineCompleted || currentSegmentIndex === -1) {
      routineActive = true;
      routineCompleted = false;
      currentSegmentIndex = 0;
      segmentRemainingSeconds = routineSegments[0].minutes * 60;
      elapsedSeconds = 0;
    } else if (segmentRemainingSeconds <= 0 && currentSegmentIndex >= 0) {
      segmentRemainingSeconds = routineSegments[currentSegmentIndex].minutes * 60;
    }

    timerDisplay.textContent = formatTime(segmentRemainingSeconds);
    updateRoutineHighlight();
    updateRoutineStatus();
  } else {
    timerDisplay.textContent = formatTime(elapsedSeconds);
  }

  isRunning = true;
  startPauseBtn.textContent = '일시정지';
  syncRoutineControls();

  timerInterval = setInterval(() => {
    if (routineSegments.length > 0 && routineActive) {
      if (segmentRemainingSeconds > 0) {
        segmentRemainingSeconds -= 1;
        elapsedSeconds += 1;
        timerDisplay.textContent = formatTime(segmentRemainingSeconds);
        updateRoutineStatus();
        if (segmentRemainingSeconds === 0) {
          handleSegmentCompletion();
        }
      } else {
        handleSegmentCompletion();
      }
    } else {
      elapsedSeconds += 1;
      timerDisplay.textContent = formatTime(elapsedSeconds);
    }
  }, 1000);
}

function openPauseModal() {
  if (!pauseOverlay) {
    return;
  }
  lastFocusedElement = document.activeElement;
  pauseOverlay.classList.remove('hidden');
  const firstOption = pauseOverlay.querySelector('.pause-option');
  if (firstOption) {
    firstOption.focus();
  } else if (customPauseInput) {
    customPauseInput.focus();
  }
}

function closePauseModal() {
  if (!pauseOverlay) {
    return;
  }
  pauseOverlay.classList.add('hidden');
  if (customPauseInput) {
    customPauseInput.value = '';
  }
  if (lastFocusedElement) {
    lastFocusedElement.focus();
  }
  lastFocusedElement = null;
}

function logPauseCategory(category) {
  if (!category) {
    return;
  }
  createLogEntry({
    label: '일시정지',
    tag: category,
    durationSeconds: elapsedSeconds,
  });
  closePauseModal();
}

function pauseTimer({ triggerCategoryPrompt = true } = {}) {
  if (!isRunning) {
    return;
  }

  clearInterval(timerInterval);
  timerInterval = null;
  isRunning = false;
  startPauseBtn.textContent = '재시작';
  updateRoutineStatus();
  syncRoutineControls();

  if (triggerCategoryPrompt) {
    openPauseModal();
  }
}

function resetTimer() {
  if (isRunning) {
    pauseTimer({ triggerCategoryPrompt: false });
  }

  elapsedSeconds = 0;
  timerDisplay.textContent = '00:00:00';
  startPauseBtn.textContent = '시작';
  closePauseModal();

  if (routineSegments.length > 0) {
    resetRoutineState();
    updateRoutineStatus();
    updateRoutineHighlight();
  }

  syncRoutineControls();
}

function toggleTimer() {
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function createLogEntry({ label, tag, durationSeconds, timestamp = new Date() }) {
  const listItem = document.createElement('li');
  listItem.classList.add('log-entry');

  const infoWrapper = document.createElement('div');
  infoWrapper.classList.add('log-entry__info');

  if (label || tag) {
    const header = document.createElement('div');
    header.classList.add('log-entry__header');

    if (label) {
      const labelEl = document.createElement('span');
      labelEl.classList.add('log-entry__label');
      labelEl.textContent = label;
      header.appendChild(labelEl);
    }

    if (tag) {
      const tagEl = document.createElement('span');
      tagEl.classList.add('log-entry__tag');
      tagEl.textContent = tag;
      header.appendChild(tagEl);
    }

    infoWrapper.appendChild(header);
  }

  const duration = document.createElement('span');
  duration.classList.add('log-entry__time');
  duration.textContent = formatTime(Math.max(0, durationSeconds));

  const timestampEl = document.createElement('span');
  timestampEl.classList.add('log-entry__timestamp');
  timestampEl.textContent = formatTimestamp(timestamp);

  infoWrapper.appendChild(duration);
  infoWrapper.appendChild(timestampEl);

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.classList.add('log-entry__delete');
  deleteBtn.setAttribute('aria-label', '기록 삭제');
  deleteBtn.textContent = '삭제';
  deleteBtn.addEventListener('click', () => {
    listItem.remove();
  });

  listItem.appendChild(infoWrapper);
  listItem.appendChild(deleteBtn);
  logList.prepend(listItem);
}

function logCurrentSession() {
  if (elapsedSeconds === 0) {
    return;
  }

  const label = routineSegments.length > 0 ? '루틴 전체 기록' : '학습 세션';
  createLogEntry({
    label,
    durationSeconds: elapsedSeconds,
  });
}

function logRoutineSegment(segment) {
  if (!segment) {
    return;
  }

  const label = segment.type === 'study' ? '공부 구간 완료' : '휴식 구간 완료';
  const tag = `${segment.minutes}분`;
  createLogEntry({
    label,
    tag,
    durationSeconds: segment.minutes * 60,
  });
}

prevMonthBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar(currentDate);
});

nextMonthBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar(currentDate);
});

startPauseBtn.addEventListener('click', toggleTimer);
resetBtn.addEventListener('click', resetTimer);
logBtn.addEventListener('click', logCurrentSession);

routineForm.addEventListener('submit', addRoutineSegment);
segmentTypeSelect.addEventListener('change', () => {
  segmentMinutesInput.placeholder =
    segmentTypeSelect.value === 'study' ? '예: 50' : '예: 10';
});
clearRoutineBtn.addEventListener('click', clearRoutine);

pauseOptionButtons.forEach((button) => {
  button.addEventListener('click', () => {
    logPauseCategory(button.dataset.category);
  });
});

customPauseForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = customPauseInput.value.trim();
  if (value) {
    logPauseCategory(value);
  }
});

closePauseModalBtn.addEventListener('click', () => {
  closePauseModal();
});

pauseOverlay.addEventListener('click', (event) => {
  if (event.target === pauseOverlay) {
    closePauseModal();
  }
});

document.addEventListener('keydown', (event) => {
  if (!pauseOverlay.classList.contains('hidden') && event.key === 'Escape') {
    event.preventDefault();
    closePauseModal();
  }
});

renderCalendar(currentDate);
renderRoutineList();
segmentMinutesInput.placeholder = '예: 50';
syncRoutineControls();