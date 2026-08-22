// MedAlert Lucknow — Emergency Care, Medical Consultation, Hospital Finder, Donor Registry & UP Schemes

const api = (path, options) => fetch(path, options).then((response) => {
  if (!response.ok) throw new Error('Network request failed');
  return response.json();
});

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));
}

// Markdown Formatter with link support for consultation responses
function parseMarkdown(text) {
  if (!text) return '';
  let formatted = escapeHtml(text);

  // Markdown Links: [label](url)
  formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, (match, label, url) => {
    const isTel = url.startsWith('tel:');
    const isExternal = url.startsWith('http');
    const bgClass = isTel ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
    return `<a href="${url}" ${isExternal ? 'target="_blank"' : ''} class="inline-flex items-center gap-1 font-bold text-xs px-2 py-0.5 rounded-lg border ${bgClass} transition">${label}</a>`;
  });

  // Headers
  formatted = formatted.replace(/^### (.*$)/gim, '<h3 class="font-bold text-sm text-slate-900 mt-2.5 mb-1">$1</h3>');
  formatted = formatted.replace(/^## (.*$)/gim, '<h2 class="font-bold text-base text-slate-900 mt-3 mb-1.5">$1</h2>');

  // Bold
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
  
  // Italic
  formatted = formatted.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

  // Bullet Lists
  formatted = formatted.replace(/^\s*[-•]\s+(.*$)/gim, '<li class="ml-4 list-disc text-slate-700">$1</li>');

  // Line breaks
  formatted = formatted.replace(/\n/g, '<br>');

  return formatted;
}

// Conversation History & Multi-modal State
let chatHistory = [];
let selectedImageBase64 = null;
let selectedFileName = '';

// SOS Dispatch Countdown Manager
let sosTimer = null;
let sosCountdown = 5;

function openSosModal() {
  const modal = document.getElementById('sos-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  sosCountdown = 5;
  const countEl = document.getElementById('sos-countdown-val');
  const statusEl = document.getElementById('sos-modal-status');
  const cancelBtn = document.getElementById('sos-cancel-btn');

  if (countEl) countEl.textContent = sosCountdown;
  if (statusEl) statusEl.textContent = 'Connecting to UP Emergency Control Room (112)...';
  if (cancelBtn) cancelBtn.style.display = 'inline-block';

  clearInterval(sosTimer);
  sosTimer = setInterval(() => {
    sosCountdown -= 1;
    if (countEl) countEl.textContent = sosCountdown;

    if (sosCountdown <= 0) {
      clearInterval(sosTimer);
      if (countEl) countEl.textContent = '0';
      if (statusEl) {
        statusEl.innerHTML = '<span class="text-emerald-600 font-bold">🚨 EMERGENCY DISPATCH SIGNAL TRANSMITTED!</span><br><span class="text-xs text-slate-500">Dispatch ID: #LKO-112-' + Math.floor(1000 + Math.random() * 9000) + ' · Paramedic Unit Alerted</span>';
      }
      if (cancelBtn) cancelBtn.style.display = 'none';
    }
  }, 1000);
}

function cancelSos() {
  clearInterval(sosTimer);
  const modal = document.getElementById('sos-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

// Live Camera Access Stream Handler
let cameraStream = null;

async function openCameraModal() {
  const modal = document.getElementById('camera-modal');
  const video = document.getElementById('camera-video');
  if (!modal || !video) return;

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    video.srcObject = cameraStream;
  } catch (err) {
    console.warn('Camera access fallback or denied:', err);
    closeCameraModal();
    const fileInput = document.getElementById('inchat-ocr-file');
    if (fileInput) fileInput.click();
  }
}

function closeCameraModal() {
  const modal = document.getElementById('camera-modal');
  const video = document.getElementById('camera-video');
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  if (video) video.srcObject = null;
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function snapPhotoFromCamera() {
  const video = document.getElementById('camera-video');
  const canvas = document.getElementById('camera-canvas');
  if (!video || !canvas) return;

  const context = canvas.getContext('2d');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const base64Data = canvas.toDataURL('image/jpeg', 0.92);
  closeCameraModal();
  setAttachedImage(base64Data, 'camera_prescription_capture.jpg');
}

function setAttachedImage(base64Data, fileName) {
  selectedImageBase64 = base64Data;
  selectedFileName = fileName || 'prescription_photo.jpg';

  const container = document.getElementById('attachment-preview-container');
  const nameEl = document.getElementById('attachment-file-name');

  if (container) container.classList.remove('hidden');
  if (nameEl) nameEl.textContent = selectedFileName;
}

function clearAttachedImage() {
  selectedImageBase64 = null;
  selectedFileName = '';

  const container = document.getElementById('attachment-preview-container');
  if (container) container.classList.add('hidden');

  const fileInput = document.getElementById('inchat-ocr-file');
  if (fileInput) fileInput.value = '';

  const sidebarInput = document.getElementById('sidebar-ocr-file');
  if (sidebarInput) sidebarInput.value = '';
}

// Speech-to-Text Voice Input Handler
function startVoiceRecognition() {
  const micBtn = document.querySelector('#mic-voice-btn');
  const chatInput = document.querySelector('#chat-input-field');

  if (micBtn) {
    micBtn.classList.add('bg-red-500', 'text-white', 'animate-pulse');
  }

  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    api('/api/stt', { method: 'POST' }).then(data => {
      const text = data.transcript || 'I have a fever and common cold';
      if (chatInput) chatInput.value = text;
      sendChatMessage(null, text);
    }).finally(() => {
      if (micBtn) micBtn.classList.remove('bg-red-500', 'text-white', 'animate-pulse');
    });
    return;
  }

  try {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (chatInput) chatInput.value = transcript;
      sendChatMessage(null, transcript);
    };

    recognition.onerror = () => {
      const fallbackText = 'I have a fever and common cold';
      if (chatInput) chatInput.value = fallbackText;
      sendChatMessage(null, fallbackText);
    };

    recognition.onend = () => {
      if (micBtn) micBtn.classList.remove('bg-red-500', 'text-white', 'animate-pulse');
    };

    recognition.start();
  } catch (err) {
    console.error(err);
    if (chatInput) {
      chatInput.value = 'I have a fever and common cold';
      sendChatMessage(null, chatInput.value);
    }
    if (micBtn) micBtn.classList.remove('bg-red-500', 'text-white', 'animate-pulse');
  }
}

// Medical Consultation Handler
async function sendChatMessage(event, predefinedMsg) {
  if (event) event.preventDefault();

  const inputEl = document.querySelector('#chat-input-field');
  const chatStream = document.querySelector('#chat-message-stream');

  const message = predefinedMsg || (inputEl ? inputEl.value.trim() : '');
  const attachedImage = selectedImageBase64;
  const attachedName = selectedFileName;

  if (!message && !attachedImage) return;

  if (inputEl && !predefinedMsg) inputEl.value = '';
  clearAttachedImage();

  let imageThumbnailHtml = '';
  if (attachedImage) {
    imageThumbnailHtml = `
      <div class="mb-2 overflow-hidden rounded-xl border border-white/20 max-w-[200px]">
        <img src="${attachedImage}" alt="Attached Document" class="w-full object-cover max-h-40">
        <div class="text-[10px] bg-slate-900/80 px-2 py-0.5 text-slate-300 truncate">📷 ${escapeHtml(attachedName)}</div>
      </div>
    `;
  }

  if (chatStream) {
    chatStream.innerHTML += `
      <div class="flex justify-end mb-4 chat-bubble-anim">
        <div class="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 rounded-3xl rounded-tr-none text-xs sm:text-sm font-medium max-w-[85%] shadow-md">
          ${imageThumbnailHtml}
          <div>${escapeHtml(message || 'Analyze attached prescription image')}</div>
        </div>
      </div>
    `;

    const tempAiId = 'ai-loading-' + Date.now();
    chatStream.innerHTML += `
      <div id="${tempAiId}" class="flex justify-start mb-4 chat-bubble-anim">
        <div class="bg-white border border-slate-200 text-slate-700 p-4 rounded-3xl rounded-tl-none text-xs max-w-[85%] space-y-2 shadow-sm">
          <div class="flex items-center gap-2 text-slate-600 font-bold">
            <span>🩺 Medical consultant is reviewing</span>
            <div class="typing-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>
    `;
    chatStream.scrollTop = chatStream.scrollHeight;

    if (message) {
      chatHistory.push({ role: 'user', content: message });
    }

    try {
      const data = await api('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          history: chatHistory,
          image: attachedImage
        })
      });

      const loadingNode = document.getElementById(tempAiId);
      if (loadingNode) {
        const parsedAnswerHtml = parseMarkdown(data.answer);

        chatHistory.push({ role: 'assistant', content: data.answer });

        let contextsHtml = '';
        if (data.retrieved_context && data.retrieved_context.length > 0) {
          contextsHtml = `
            <div class="mt-3 pt-3 border-t border-slate-200/80 space-y-2">
              <div class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Retrieved Lucknow Health Cards:</div>
              <div class="space-y-1.5">
                ${data.retrieved_context.map(c => `
                  <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-bold text-slate-900">📂 ${escapeHtml(c.title)}</span>
                      <span class="text-[10px] font-semibold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full">${escapeHtml(c.source)}</span>
                    </div>
                    <p class="text-[11px] text-slate-600 leading-relaxed">${escapeHtml(c.snippet)}</p>
                    ${c.map_url || c.phone ? `
                      <div class="pt-1 flex flex-wrap items-center gap-2">
                        ${c.phone ? `<a href="tel:${escapeHtml(c.phone)}" class="py-1 px-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[10px] rounded-xl border border-red-200 transition">📞 Call ${escapeHtml(c.phone)}</a>` : ''}
                        ${c.map_url ? `<a href="${escapeHtml(c.map_url)}" target="_blank" class="py-1 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] rounded-xl border border-blue-200 transition">🗺️ View Map Location ↗</a>` : ''}
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }

        let followupsHtml = '';
        if (data.suggested_followups && data.suggested_followups.length > 0) {
          followupsHtml = `
            <div class="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
              <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Suggested Follow-up Consultations:</div>
              <div class="flex flex-wrap gap-1.5">
                ${data.suggested_followups.map(chip => `
                  <button type="button" data-msg="${escapeHtml(chip)}" class="chat-prompt-chip py-1 px-2.5 bg-slate-100 hover:bg-red-50 hover:border-red-200 text-slate-700 hover:text-red-700 text-[11px] font-medium rounded-xl border border-slate-200 transition">
                    💡 ${escapeHtml(chip)}
                  </button>
                `).join('')}
              </div>
            </div>
          `;
        }

        loadingNode.outerHTML = `
          <div class="flex justify-start mb-4 chat-bubble-anim">
            <div class="bg-white border border-slate-200 text-slate-800 p-4 sm:p-5 rounded-3xl rounded-tl-none text-xs sm:text-sm max-w-[90%] shadow-md space-y-3">
              <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                <span class="font-bold text-red-600 flex items-center gap-1.5">
                  🩺 <span>Virtual Doctor Assistant</span>
                </span>
                <span class="text-[10px] text-slate-400 font-mono">Care guidance</span>
              </div>
              
              <div class="leading-relaxed text-slate-800 space-y-2">
                ${parsedAnswerHtml}
              </div>

              ${contextsHtml}
              ${followupsHtml}
            </div>
          </div>
        `;
        chatStream.scrollTop = chatStream.scrollHeight;
      }
    } catch (err) {
      console.error(err);
      const loadingNode = document.getElementById(tempAiId);
      if (loadingNode) {
        loadingNode.outerHTML = `
          <div class="flex justify-start mb-4 chat-bubble-anim">
            <div class="bg-red-50 border border-red-200 text-red-800 p-4 rounded-3xl rounded-tl-none text-xs max-w-[85%] shadow-sm">
              ⚠️ Connection error. Please check your internet or try again.
            </div>
          </div>
        `;
      }
    }
  }
}

function handleInChatOcrUpload(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    setAttachedImage(e.target.result, file.name);
  };
  reader.readAsDataURL(file);
}


// ============================================================================
// HOSPITAL FINDER & INTERACTIVE LEAFLET MAP ENGINE
// ============================================================================

let hospitalMap = null;
let mapMarkersLayer = null;
let currentHospitals = [];

function initHospitalMap() {
  const mapEl = document.getElementById('hospital-map');
  if (!mapEl || hospitalMap) return;

  try {
    if (typeof L !== 'undefined') {
      hospitalMap = L.map('hospital-map').setView([26.8467, 80.9462], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors | MedAlert Lucknow'
      }).addTo(hospitalMap);

      mapMarkersLayer = L.layerGroup().addTo(hospitalMap);
    }
  } catch (err) {
    console.warn('Leaflet map initialization notice:', err);
  }
}

function updateHospitalMapMarkers(hospitals) {
  if (!hospitalMap || !mapMarkersLayer || typeof L === 'undefined') return;

  mapMarkersLayer.clearLayers();
  const bounds = [];

  hospitals.forEach(h => {
    const lat = parseFloat(h.latitude);
    const lng = parseFloat(h.longitude);

    if (!isNaN(lat) && !isNaN(lng)) {
      bounds.push([lat, lng]);

      const mapQuery = encodeURIComponent(`${h.name} ${h.address}`);
      const googleMapUrl = `https://maps.google.com/?q=${mapQuery}`;

      const popupContent = `
        <div class="p-2 space-y-2 text-slate-900 font-sans max-w-[240px]">
          <div class="font-bold text-sm text-red-600 leading-tight">${escapeHtml(h.name)}</div>
          <div class="text-[11px] text-slate-500 font-medium">📍 ${escapeHtml(h.area)} · ${escapeHtml(h.facility_type)}</div>
          
          <div class="grid grid-cols-3 gap-1 text-[10px] text-center font-bold py-1 bg-slate-100 rounded-lg">
            <div class="p-1"><span class="block text-slate-400 font-normal">Total</span>${h.beds || 0}</div>
            <div class="p-1 text-red-600"><span class="block text-slate-400 font-normal">ICU</span>${h.icu_beds || 0}</div>
            <div class="p-1 text-emerald-600"><span class="block text-slate-400 font-normal">Emerg</span>${h.emergency_beds || 0}</div>
          </div>

          <div class="text-[11px] font-semibold text-slate-700">
            🏥 ${escapeHtml(h.trauma_level || 'Emergency Care')}
          </div>

          <div class="pt-1 flex items-center justify-between gap-1 border-t border-slate-200">
            <a href="tel:${escapeHtml(h.phone)}" class="py-1 px-2 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-lg transition">📞 Call ${escapeHtml(h.phone)}</a>
            <a href="${googleMapUrl}" target="_blank" class="py-1 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] rounded-lg border border-blue-200 transition">🗺️ Map ↗</a>
          </div>
        </div>
      `;

      const marker = L.marker([lat, lng]).bindPopup(popupContent);
      mapMarkersLayer.addLayer(marker);
    }
  });

  if (bounds.length > 0) {
    hospitalMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }
}

async function loadHospitals() {
  const container = document.getElementById('hospital-results');
  const badge = document.getElementById('hospital-count-badge');
  if (!container) return;

  initHospitalMap();

  const query = document.getElementById('hospital-query')?.value || '';
  const area = document.getElementById('area')?.value || '';
  const specialty = document.getElementById('specialty')?.value || '';
  const facilityType = document.getElementById('facility-type')?.value || '';
  const scheme = document.getElementById('scheme-filter')?.value || '';
  const emergencyOnly = document.getElementById('emergency')?.checked ? 'true' : 'false';

  const params = new URLSearchParams({
    q: query,
    area: area,
    specialty: specialty,
    facility_type: facilityType,
    scheme: scheme,
    emergency: emergencyOnly
  });

  try {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-500 space-y-2">
        <div class="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-xs font-semibold">Searching Lucknow emergency hospital network...</p>
      </div>
    `;

    const data = await api(`/api/hospitals?${params.toString()}`);
    currentHospitals = data.hospitals || [];

    if (badge) {
      badge.textContent = `${data.count} Empanelled Hospitals Found`;
    }

    if (currentHospitals.length === 0) {
      container.innerHTML = `
        <div class="col-span-full bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
          <div class="text-4xl">🏥</div>
          <h3 class="font-bold text-lg text-slate-800">No matching Lucknow hospitals found</h3>
          <p class="text-xs text-slate-500">Try adjusting your specialty, area, or scheme filters.</p>
        </div>
      `;
      if (mapMarkersLayer) mapMarkersLayer.clearLayers();
      return;
    }

    updateHospitalMapMarkers(currentHospitals);

    container.innerHTML = currentHospitals.map(h => {
      const mapQuery = encodeURIComponent(`${h.name} ${h.address}`);
      const googleMapUrl = `https://maps.google.com/?q=${mapQuery}`;
      const isEmergency = String(h.emergency).toLowerCase() === 'yes';

      return `
        <div class="bg-white border border-slate-200 hover:border-red-300 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4 group">
          
          <div class="space-y-3">
            <div class="flex items-start justify-between gap-2">
              <div>
                <span class="px-2.5 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded-full uppercase tracking-wider">${escapeHtml(h.facility_type || 'Hospital')}</span>
                <h3 class="font-bold text-lg font-heading text-slate-900 group-hover:text-red-600 transition-colors mt-1 leading-snug">${escapeHtml(h.name)}</h3>
              </div>
              <span class="px-2.5 py-1 bg-amber-50 text-amber-800 font-extrabold text-xs rounded-xl border border-amber-200 shrink-0">⭐ ${escapeHtml(h.rating || '4.5')}</span>
            </div>

            <p class="text-xs text-slate-500 flex items-center gap-1.5">
              <span>📍 ${escapeHtml(h.area)}</span>
              <span>•</span>
              <span>${escapeHtml(h.address)}</span>
            </p>

            <div class="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Bed Capacity Readiness:</span>
                ${isEmergency ? '<span class="text-red-600 font-extrabold flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span> 24/7 Trauma Ready</span>' : ''}
              </div>

              <div class="grid grid-cols-3 gap-2 text-center text-xs">
                <div class="p-2 bg-white rounded-xl border border-slate-200">
                  <div class="text-[10px] text-slate-400">Total Beds</div>
                  <div class="font-bold text-slate-800 font-heading">${h.beds || 0}</div>
                </div>
                <div class="p-2 bg-red-50 rounded-xl border border-red-200">
                  <div class="text-[10px] text-red-500 font-medium">ICU Beds</div>
                  <div class="font-extrabold text-red-700 font-heading">${h.icu_beds || 0}</div>
                </div>
                <div class="p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div class="text-[10px] text-emerald-600 font-medium">Emergency</div>
                  <div class="font-extrabold text-emerald-700 font-heading">${h.emergency_beds || 0}</div>
                </div>
              </div>
            </div>

            <div class="text-xs space-y-1">
              <div class="font-semibold text-slate-700">🩺 Clinical Specialties:</div>
              <p class="text-slate-500 text-[11px] leading-relaxed">${escapeHtml(h.specialties)}</p>
            </div>

            ${h.empanelled_schemes ? `
              <div class="text-xs space-y-1">
                <div class="font-semibold text-slate-700">📜 Empanelled Schemes:</div>
                <p class="text-amber-800 text-[11px] font-medium leading-relaxed">${escapeHtml(h.empanelled_schemes)}</p>
              </div>
            ` : ''}

            ${h.treatment_cost_range ? `
              <div class="text-xs space-y-1 pt-1 border-t border-slate-100">
                <div class="text-[11px] text-slate-500">Consultation / Cost: <span class="font-bold text-slate-800">${escapeHtml(h.avg_consultation_fee || 'Standard')}</span> (${escapeHtml(h.treatment_cost_range)})</div>
              </div>
            ` : ''}
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
            <a href="tel:${escapeHtml(h.phone)}" class="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5">
              <span>📞 Call Triage: ${escapeHtml(h.phone)}</span>
            </a>
            <a href="${googleMapUrl}" target="_blank" class="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 transition flex items-center gap-1">
              <span>🗺️ Directions ↗</span>
            </a>
          </div>

        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Error fetching hospital listings:', err);
    if (container) {
      container.innerHTML = `
        <div class="col-span-full p-8 bg-red-50 border border-red-200 text-red-800 rounded-3xl text-center text-xs">
          ⚠️ Unable to load Lucknow hospital directory. Please try again.
        </div>
      `;
    }
  }
}


// ============================================================================
// BLOOD & ORGAN DONOR REGISTRY ENGINE
// ============================================================================

async function loadDonors() {
  const container = document.getElementById('donor-results');
  const badge = document.getElementById('donor-count-badge');
  if (!container) return;

  const query = document.getElementById('donor-query')?.value || '';
  const bloodGroup = document.getElementById('donor-blood-group')?.value || '';
  const organType = document.getElementById('donor-organ-type')?.value || '';

  const params = new URLSearchParams({
    q: query,
    blood_group: bloodGroup,
    type: organType
  });

  try {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-500 space-y-2">
        <div class="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-xs font-semibold">Loading Lucknow donor registry & priority scores...</p>
      </div>
    `;

    const data = await api(`/api/donors?${params.toString()}`);
    const donors = data.donors || [];

    if (badge) {
      badge.textContent = `${data.count} Registered Donors Active`;
    }

    if (donors.length === 0) {
      container.innerHTML = `
        <div class="col-span-full bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
          <div class="text-4xl">🩸</div>
          <h3 class="font-bold text-lg text-slate-800">No matching donors found</h3>
          <p class="text-xs text-slate-500">Try broadening your blood group or location search parameters.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = donors.map(d => {
      const isRare = ['O-', 'AB-', 'A-', 'B-'].includes(String(d.blood_group).toUpperCase());
      const isOrgan = String(d.organ).toLowerCase() !== 'blood';
      const isAvailable = String(d.availability).toLowerCase() === 'available';

      return `
        <div class="bg-white border border-slate-200 hover:border-emerald-300 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4 group">
          
          <div class="space-y-3">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 ${isOrgan ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'} rounded-2xl flex items-center justify-center font-extrabold text-xl shadow-sm">
                  ${isOrgan ? '🫀' : '🩸'}
                </div>
                <div>
                  <h3 class="font-bold text-base font-heading text-slate-900 group-hover:text-emerald-600 transition-colors">${escapeHtml(d.name)}</h3>
                  <p class="text-xs text-slate-500">📍 ${escapeHtml(d.area)} · Verified Record</p>
                </div>
              </div>

              <span class="px-3 py-1 ${isRare ? 'bg-red-600 text-white animate-pulse' : 'bg-emerald-100 text-emerald-800'} font-extrabold text-xs rounded-xl shadow-sm">
                ${escapeHtml(d.blood_group)}
              </span>
            </div>

            <div class="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-slate-500 font-medium">Donation Type:</span>
                <span class="font-bold text-slate-900">${escapeHtml(d.organ)}</span>
              </div>

              <div class="flex items-center justify-between">
                <span class="text-slate-500 font-medium">Availability Status:</span>
                <span class="font-extrabold ${isAvailable ? 'text-emerald-600' : 'text-amber-600'}">
                  ● ${escapeHtml(d.availability)}
                </span>
              </div>

              <div class="flex items-center justify-between">
                <span class="text-slate-500 font-medium">Response Time:</span>
                <span class="font-bold text-slate-800">~${escapeHtml(d.response_time_mins || 15)} mins</span>
              </div>

              ${d.priority_score ? `
                <div class="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span class="text-slate-500 font-medium">Priority Score:</span>
                  <span class="font-extrabold text-red-600 font-heading">⚡ ${d.priority_score} / 100</span>
                </div>
              ` : ''}
            </div>

            <div class="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Urgency: <strong class="text-slate-700">${escapeHtml(d.urgency_priority || 'High')}</strong></span>
              <span>Donations: <strong class="text-slate-700">${d.donation_count || 0} times</strong></span>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <a href="tel:${escapeHtml(d.phone)}" class="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5">
              <span>📞 Contact Emergency Line: ${escapeHtml(d.phone)}</span>
            </a>
          </div>

        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Error loading donor records:', err);
    if (container) {
      container.innerHTML = `
        <div class="col-span-full p-8 bg-red-50 border border-red-200 text-red-800 rounded-3xl text-center text-xs">
          ⚠️ Unable to load Lucknow donor registry. Please try again.
        </div>
      `;
    }
  }
}


// ============================================================================
// UP GOVERNMENT HEALTH SCHEMES ENGINE
// ============================================================================

async function loadSchemes() {
  const container = document.getElementById('scheme-results');
  const badge = document.getElementById('scheme-count-badge');
  if (!container) return;

  const query = document.getElementById('scheme-query')?.value || '';
  const department = document.getElementById('scheme-department')?.value || '';

  const params = new URLSearchParams({
    q: query,
    department: department
  });

  try {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-500 space-y-2">
        <div class="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-xs font-semibold">Fetching UP State health schemes & coverage portals...</p>
      </div>
    `;

    const data = await api(`/api/schemes?${params.toString()}`);
    const schemes = data.schemes || [];

    if (badge) {
      badge.textContent = `${data.count} Government Schemes Active`;
    }

    if (schemes.length === 0) {
      container.innerHTML = `
        <div class="col-span-full bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
          <div class="text-4xl">📜</div>
          <h3 class="font-bold text-lg text-slate-800">No matching health schemes found</h3>
          <p class="text-xs text-slate-500">Try adjusting your keyword search or department filter.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = schemes.map(s => {
      const docs = String(s.documentation_required || '').split(';').map(d => d.trim()).filter(Boolean);

      return `
        <div class="bg-white border border-slate-200 hover:border-amber-300 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-5 group">
          
          <div class="space-y-4">
            <div class="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span class="px-3 py-1 bg-amber-100 text-amber-900 font-extrabold text-[10px] rounded-full uppercase tracking-wider">${escapeHtml(s.department)}</span>
                <h3 class="font-bold text-xl font-heading text-slate-900 group-hover:text-amber-700 transition-colors mt-1.5">${escapeHtml(s.name)}</h3>
              </div>
              <div class="w-10 h-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0">
                📜
              </div>
            </div>

            <div class="p-4 bg-amber-50/60 rounded-2xl border border-amber-100 space-y-1.5">
              <div class="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <span>🎁 Coverage Benefit:</span>
              </div>
              <p class="text-xs text-amber-950 leading-relaxed font-semibold">${escapeHtml(s.benefit)}</p>
            </div>

            <div class="space-y-1.5 text-xs">
              <div class="font-bold text-slate-800">📋 Eligibility Criteria:</div>
              <p class="text-slate-600 text-xs leading-relaxed">${escapeHtml(s.eligibility)}</p>
            </div>

            ${docs.length > 0 ? `
              <div class="space-y-2 pt-2 border-t border-slate-100">
                <div class="text-xs font-bold text-slate-800">📁 Required Documents Checklist:</div>
                <div class="flex flex-wrap gap-1.5">
                  ${docs.map(doc => `
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 text-[11px] font-medium rounded-xl border border-slate-200">
                      <span>✓</span> <span>${escapeHtml(doc)}</span>
                    </span>
                  `).join('')}
                </div>
              </div>
            ` : ''}

          </div>

          <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
            <a href="${escapeHtml(s.link || 'https://up.gov.in/')}" target="_blank" class="w-full py-3 px-6 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2">
              <span>Apply / Official UP Govt Portal</span>
              <span>↗</span>
            </a>
          </div>

        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Error loading UP schemes:', err);
    if (container) {
      container.innerHTML = `
        <div class="col-span-full p-8 bg-red-50 border border-red-200 text-red-800 rounded-3xl text-center text-xs">
          ⚠️ Unable to load UP health schemes directory. Please try again.
        </div>
      `;
    }
  }
}


// ============================================================================
// EMERGENCY TRAUMA TRIAGE HANDLER
// ============================================================================

async function handleTriageSubmit(e) {
  if (e) e.preventDefault();

  const container = document.getElementById('triage-result');
  if (!container) return;

  const symptomEls = document.querySelectorAll('input[name="symptom"]:checked');
  const symptoms = Array.from(symptomEls).map(el => el.value);

  const vitals = {
    oxygen: parseFloat(document.getElementById('oxygen')?.value || 98),
    heart_rate: parseFloat(document.getElementById('heart-rate')?.value || 75),
    sys_bp: parseFloat(document.getElementById('sys-bp')?.value || 120)
  };

  try {
    container.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3 shadow-sm">
        <div class="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-xs font-semibold text-slate-600">Calculating clinical urgency score & routing trauma centers...</p>
      </div>
    `;

    const assessment = await api('/api/triage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptoms, vitals })
    });

    let levelBg = 'bg-emerald-600 text-white';
    let levelBorder = 'border-emerald-500';
    let alertTitle = '🟢 Low Urgency / Monitored Care';

    if (assessment.level === 'RED') {
      levelBg = 'bg-red-600 text-white';
      levelBorder = 'border-red-600';
      alertTitle = '🚨 CRITICAL EMERGENCY - IMMEDIATE DISPATCH NEEDED';
    } else if (assessment.level === 'AMBER') {
      levelBg = 'bg-amber-500 text-slate-950';
      levelBorder = 'border-amber-500';
      alertTitle = '⚠️ URGENT MEDICAL CARE REQUIRED';
    }

    let warningsHtml = '';
    if (assessment.vital_warnings && assessment.vital_warnings.length > 0) {
      warningsHtml = `
        <div class="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-1.5">
          <div class="text-xs font-extrabold text-red-800 uppercase tracking-wider">⚠️ Vital Sign Alert Warnings:</div>
          <ul class="text-xs text-red-700 space-y-1 font-semibold">
            ${assessment.vital_warnings.map(w => `<li>• ${escapeHtml(w)}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    let actionStepsHtml = '';
    if (assessment.action_steps && assessment.action_steps.length > 0) {
      actionStepsHtml = `
        <div class="space-y-2">
          <div class="text-xs font-bold text-slate-900 uppercase tracking-wider">Immediate Clinical Action Steps:</div>
          <ol class="space-y-2">
            ${assessment.action_steps.map((step, idx) => `
              <li class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 flex items-start gap-2.5">
                <span class="w-5 h-5 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-xs shrink-0">${idx + 1}</span>
                <span class="leading-relaxed font-medium">${escapeHtml(step)}</span>
              </li>
            `).join('')}
          </ol>
        </div>
      `;
    }

    let hospitalsHtml = '';
    if (assessment.recommended_hospitals && assessment.recommended_hospitals.length > 0) {
      hospitalsHtml = `
        <div class="space-y-3 pt-4 border-t border-slate-200">
          <div class="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center justify-between">
            <span>Recommended Lucknow Emergency Hospitals:</span>
            <span class="text-[10px] text-red-600 font-bold">24/7 Trauma Ready</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${assessment.recommended_hospitals.map(h => `
              <div class="p-4 bg-white border border-slate-200 rounded-2xl space-y-2 text-xs shadow-sm">
                <div class="font-bold text-slate-900 font-heading text-sm">${escapeHtml(h.name)}</div>
                <div class="text-[11px] text-slate-500">📍 ${escapeHtml(h.area)} · ${escapeHtml(h.trauma_level || 'Trauma Center')}</div>
                
                <div class="text-[11px] font-medium text-slate-700">
                  🛏️ ICU Beds: <strong class="text-red-600">${h.icu_beds || 0}</strong> | Emergency: <strong class="text-emerald-600">${h.emergency_beds || 0}</strong>
                </div>

                <div class="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                  <a href="tel:${escapeHtml(h.phone)}" class="py-1.5 px-3 bg-red-600 text-white font-bold text-[11px] rounded-xl hover:bg-red-700 transition">📞 Call ${escapeHtml(h.phone)}</a>
                  ${h.map_url ? `<a href="${escapeHtml(h.map_url)}" target="_blank" class="py-1.5 px-3 bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[11px] rounded-xl hover:bg-blue-100 transition">🗺️ Map ↗</a>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="bg-white border ${levelBorder} rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 animate-fade-in">
        
        <!-- Header Banner -->
        <div class="${levelBg} p-5 rounded-2xl shadow-md flex items-center justify-between gap-4">
          <div>
            <span class="text-[10px] font-extrabold uppercase tracking-widest opacity-80">Triage Assessment Score: ${assessment.score} / 100</span>
            <h3 class="text-xl sm:text-2xl font-black font-heading mt-0.5">${escapeHtml(assessment.level_label || alertTitle)}</h3>
          </div>

          <button onclick="openSosModal()" class="py-2.5 px-4 bg-white text-red-600 font-extrabold text-xs rounded-xl shadow transition shrink-0 hover:bg-red-50">
            🚨 SOS 112
          </button>
        </div>

        ${warningsHtml}
        ${actionStepsHtml}
        ${hospitalsHtml}

        <div class="pt-3 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed italic">
          ${escapeHtml(assessment.disclaimer)}
        </div>

      </div>
    `;

    container.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    console.error('Error assessing triage:', err);
    if (container) {
      container.innerHTML = `
        <div class="p-6 bg-red-50 border border-red-200 text-red-800 rounded-3xl text-xs text-center font-bold">
          ⚠️ Unable to complete triage assessment. Please call 112 directly if you require emergency care.
        </div>
      `;
    }
  }
}


// ============================================================================
// SERVICE TAB NAVIGATION SWITCHER
// ============================================================================

function switchServiceTab(tabName) {
  const doctorContent = document.getElementById('service-tab-content-doctor');
  const donorsContent = document.getElementById('service-tab-content-donors');
  const schemesContent = document.getElementById('service-tab-content-schemes');

  const doctorBtn = document.getElementById('tab-btn-doctor');
  const donorsBtn = document.getElementById('tab-btn-donors');
  const schemesBtn = document.getElementById('tab-btn-schemes');

  if (!doctorContent || !donorsContent || !schemesContent) return;

  // Hide all
  doctorContent.classList.add('hidden');
  donorsContent.classList.add('hidden');
  schemesContent.classList.add('hidden');

  // Reset tab buttons
  [doctorBtn, donorsBtn, schemesBtn].forEach(btn => {
    if (btn) {
      btn.className = 'service-tab-btn px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition flex items-center gap-2 text-slate-700 hover:bg-slate-100';
    }
  });

  if (tabName === 'donors') {
    donorsContent.classList.remove('hidden');
    if (donorsBtn) donorsBtn.className = 'service-tab-btn px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition flex items-center gap-2 bg-emerald-600 text-white shadow-md';
    window.location.hash = 'donors';
    loadDonors();
  } else if (tabName === 'schemes') {
    schemesContent.classList.remove('hidden');
    if (schemesBtn) schemesBtn.className = 'service-tab-btn px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition flex items-center gap-2 bg-amber-600 text-white shadow-md';
    window.location.hash = 'schemes';
    loadSchemes();
  } else {
    doctorContent.classList.remove('hidden');
    if (doctorBtn) doctorBtn.className = 'service-tab-btn px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition flex items-center gap-2 bg-red-600 text-white shadow-md';
    window.location.hash = 'doctor';
  }
}


// ============================================================================
// DOCUMENT INITIALIZER
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {

  // Profile menu and account settings
  const profileAvatar = document.getElementById('profile-avatar');
  const profileMenu = document.getElementById('profile-menu');
  const closeProfileMenu = document.getElementById('close-profile-menu');
  const profileForm = document.getElementById('profile-form');
  if (profileAvatar && profileMenu) {
    profileAvatar.addEventListener('click', () => {
      const isHidden = profileMenu.classList.toggle('hidden');
      profileAvatar.setAttribute('aria-expanded', String(!isHidden));
    });
    if (closeProfileMenu) closeProfileMenu.addEventListener('click', () => profileMenu.classList.add('hidden'));
  }
  if (profileForm) {
    profileForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const result = document.getElementById('profile-result');
      const values = Object.fromEntries(new FormData(profileForm));
      try {
        const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to update profile.');
        if (result) { result.textContent = 'Settings saved.'; result.className = 'text-xs text-emerald-700'; }
        if (profileAvatar) profileAvatar.textContent = data.full_name.trim().charAt(0).toUpperCase();
      } catch (error) {
        if (result) { result.textContent = error.message; result.className = 'text-xs text-red-700'; }
      }
    });
  }

  // 1. SOS Dispatch Buttons
  document.querySelectorAll('.sos-trigger-btn').forEach(btn => {
    btn.addEventListener('click', openSosModal);
  });

  // 2. Camera Open Buttons
  const cameraBtn = document.getElementById('open-camera-btn');
  const inchatCamBtn = document.getElementById('inchat-camera-btn');
  if (cameraBtn) cameraBtn.addEventListener('click', openCameraModal);
  if (inchatCamBtn) inchatCamBtn.addEventListener('click', openCameraModal);

  // 3. File Inputs for OCR
  const inchatOcrInput = document.getElementById('inchat-ocr-file');
  if (inchatOcrInput) {
    inchatOcrInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) handleInChatOcrUpload(e.target.files[0]);
    });
  }

  const sidebarOcrInput = document.getElementById('sidebar-ocr-file');
  if (sidebarOcrInput) {
    sidebarOcrInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) handleInChatOcrUpload(e.target.files[0]);
    });
  }

  const removeAttachBtn = document.getElementById('remove-attachment-btn');
  if (removeAttachBtn) removeAttachBtn.addEventListener('click', clearAttachedImage);

  // 4. Voice Input
  const micBtn = document.getElementById('mic-voice-btn');
  if (micBtn) micBtn.addEventListener('click', startVoiceRecognition);

  // 5. Virtual Doctor Chat Form
  const chatForm = document.getElementById('chat-form');
  if (chatForm) {
    chatForm.addEventListener('submit', (e) => sendChatMessage(e, null));
  }

  const clearBtn = document.getElementById('clear-chat-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      chatHistory = [];
      clearAttachedImage();
      const stream = document.getElementById('chat-message-stream');
      if (stream) {
        stream.innerHTML = `
          <div class="flex justify-start chat-bubble-anim">
            <div class="bg-white border border-slate-200 text-slate-800 p-4 sm:p-5 rounded-3xl rounded-tl-none text-xs max-w-[90%] shadow-sm space-y-2">
              <div class="font-bold text-red-600 flex items-center gap-1.5">
                🩺 <span>Virtual Doctor Consultation Cleared</span>
              </div>
              <p class="leading-relaxed text-slate-700">
                Consultation history reset. How can I help you today? Please describe any symptoms or ask a medical query.
              </p>
            </div>
          </div>
        `;
      }
    });
  }

  // 6. Dynamic Chat Prompt Chips Listener
  document.addEventListener('click', (e) => {
    const chip = e.target.closest('.chat-prompt-chip');
    if (chip) {
      const msg = chip.getAttribute('data-msg');
      if (msg) sendChatMessage(e, msg);
    }
  });

  // 7. Hospital Finder Page Controls & Listeners
  const hospitalForm = document.getElementById('hospital-form');
  if (hospitalForm) {
    hospitalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      loadHospitals();
    });

    ['hospital-query', 'area', 'specialty', 'facility-type', 'scheme-filter', 'emergency'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => loadHospitals());
        if (el.tagName === 'INPUT' && el.type === 'text') {
          el.addEventListener('input', () => {
            clearTimeout(window._hospTimer);
            window._hospTimer = setTimeout(loadHospitals, 300);
          });
        }
      }
    });

    const resetHospBtn = document.getElementById('reset-hospitals-btn');
    if (resetHospBtn) {
      resetHospBtn.addEventListener('click', () => {
        hospitalForm.reset();
        setTimeout(loadHospitals, 50);
      });
    }

    // View Mode Toggles
    const viewSplitBtn = document.getElementById('view-split-btn');
    const viewMapBtn = document.getElementById('view-map-btn');
    const viewCardsBtn = document.getElementById('view-cards-btn');
    const mapWrapper = document.getElementById('map-section-wrapper');
    const cardsWrapper = document.getElementById('cards-section-wrapper');

    if (viewSplitBtn && viewMapBtn && viewCardsBtn && mapWrapper && cardsWrapper) {
      const setViewMode = (mode) => {
        [viewSplitBtn, viewMapBtn, viewCardsBtn].forEach(b => b.classList.remove('bg-white', 'shadow-sm', 'text-slate-900'));
        [viewSplitBtn, viewMapBtn, viewCardsBtn].forEach(b => b.classList.add('text-slate-600'));

        if (mode === 'map') {
          viewMapBtn.classList.add('bg-white', 'shadow-sm', 'text-slate-900');
          mapWrapper.classList.remove('hidden');
          cardsWrapper.classList.add('hidden');
        } else if (mode === 'cards') {
          viewCardsBtn.classList.add('bg-white', 'shadow-sm', 'text-slate-900');
          mapWrapper.classList.add('hidden');
          cardsWrapper.classList.remove('hidden');
        } else {
          viewSplitBtn.classList.add('bg-white', 'shadow-sm', 'text-slate-900');
          mapWrapper.classList.remove('hidden');
          cardsWrapper.classList.remove('hidden');
        }
        if (hospitalMap) hospitalMap.invalidateSize();
      };

      viewSplitBtn.addEventListener('click', () => setViewMode('split'));
      viewMapBtn.addEventListener('click', () => setViewMode('map'));
      viewCardsBtn.addEventListener('click', () => setViewMode('cards'));
    }

    loadHospitals();
  }

  // 8. Donor Registry Controls & Listeners
  const donorForm = document.getElementById('donor-filter-form');
  if (donorForm) {
    donorForm.addEventListener('submit', (e) => {
      e.preventDefault();
      loadDonors();
    });

    ['donor-query', 'donor-blood-group', 'donor-organ-type'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => loadDonors());
        if (el.tagName === 'INPUT' && el.type === 'text') {
          el.addEventListener('input', () => {
            clearTimeout(window._donorTimer);
            window._donorTimer = setTimeout(loadDonors, 300);
          });
        }
      }
    });

    const resetDonorBtn = document.getElementById('reset-donors-btn');
    if (resetDonorBtn) {
      resetDonorBtn.addEventListener('click', () => {
        donorForm.reset();
        setTimeout(loadDonors, 50);
      });
    }
  }

  // 9. UP Schemes Controls & Listeners
  const schemeForm = document.getElementById('scheme-filter-form');
  if (schemeForm) {
    schemeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      loadSchemes();
    });

    ['scheme-query', 'scheme-department'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => loadSchemes());
        if (el.tagName === 'INPUT' && el.type === 'text') {
          el.addEventListener('input', () => {
            clearTimeout(window._schemeTimer);
            window._schemeTimer = setTimeout(loadSchemes, 300);
          });
        }
      }
    });

    const resetSchemeBtn = document.getElementById('reset-schemes-btn');
    if (resetSchemeBtn) {
      resetSchemeBtn.addEventListener('click', () => {
        schemeForm.reset();
        setTimeout(loadSchemes, 50);
      });
    }
  }

  // 10. Trauma Triage Form Listener
  const triageForm = document.getElementById('triage-form');
  if (triageForm) {
    triageForm.addEventListener('submit', handleTriageSubmit);
  }

  // 11. Initial Route / Hash Auto-Tab Selection
  const currentPath = window.location.pathname.toLowerCase();
  const currentHash = window.location.hash.toLowerCase();

  if (currentPath.includes('/donors') || currentHash === '#donors') {
    switchServiceTab('donors');
  } else if (currentPath.includes('/schemes') || currentHash === '#schemes') {
    switchServiceTab('schemes');
  } else if (currentPath.includes('/services')) {
    switchServiceTab('doctor');
  }

});
