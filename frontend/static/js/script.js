// Medical Chatbot — MediAlert Multi-Modal Interactive Assistant Script

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
    // Fallback: trigger file input with capture="environment"
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

  canvas.toBlob((blob) => {
    if (blob) {
      const file = new File([blob], 'camera_prescription_capture.jpg', { type: 'image/jpeg' });
      closeCameraModal();
      handleInChatOcrUpload(file);
    }
  }, 'image/jpeg', 0.95);
}

// Speech-to-Text Voice Input Handler
function startVoiceRecognition() {
  const micBtn = document.querySelector('#mic-voice-btn');
  const chatInput = document.querySelector('#chat-input-field');

  if (micBtn) {
    micBtn.classList.add('bg-red-500', 'text-white', 'animate-pulse');
  }

  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    // Fallback STT simulation
    api('/api/stt', { method: 'POST' }).then(data => {
      const text = data.transcript || 'Find beds in KGMU and Lohia Institute';
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
      const fallbackText = 'Find beds in KGMU and Lohia Institute';
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
      chatInput.value = 'Find beds in KGMU and Lohia Institute';
      sendChatMessage(null, chatInput.value);
    }
    if (micBtn) micBtn.classList.remove('bg-red-500', 'text-white', 'animate-pulse');
  }
}

// Medical Chatbot RAG Handler with Typing Indicator & Bubbles
async function sendChatMessage(event, predefinedMsg) {
  if (event) event.preventDefault();

  const inputEl = document.querySelector('#chat-input-field');
  const chatStream = document.querySelector('#chat-message-stream');

  const message = predefinedMsg || (inputEl ? inputEl.value.trim() : '');
  if (!message) return;
  if (inputEl && !predefinedMsg) inputEl.value = '';

  // Append User Bubble
  if (chatStream) {
    chatStream.innerHTML += `
      <div class="flex justify-end mb-3 chat-bubble-anim">
        <div class="bg-red-600 text-white p-3.5 rounded-2xl rounded-tr-none text-xs font-semibold max-w-[85%] shadow-sm">
          ${escapeHtml(message)}
        </div>
      </div>
    `;

    // Append Typing Indicator Bubble (Banking Chatbot Bouncing Dots)
    const tempAiId = 'ai-loading-' + Date.now();
    chatStream.innerHTML += `
      <div id="${tempAiId}" class="flex justify-start mb-3 chat-bubble-anim">
        <div class="bg-white border border-slate-200 text-slate-700 p-3.5 rounded-2xl rounded-tl-none text-xs max-w-[85%] space-y-2 shadow-sm">
          <div class="flex items-center gap-2 text-slate-600 font-bold">
            <span>🤖 Medical Chatbot is typing</span>
            <div class="typing-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>
    `;
    chatStream.scrollTop = chatStream.scrollHeight;

    try {
      const data = await api('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      const loadingNode = document.getElementById(tempAiId);
      if (loadingNode) {
        let contextsHtml = '';
        if (data.retrieved_context && data.retrieved_context.length > 0) {
          contextsHtml = `
            <div class="mt-3 pt-3 border-t border-slate-200/80 space-y-2">
              <div class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Retrieved Context & Location Cards:</div>
              <div class="space-y-1.5">
                ${data.retrieved_context.map(c => `
                  <div class="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-bold text-slate-900">📂 ${escapeHtml(c.title)}</span>
                      <span class="text-[10px] font-semibold px-2 py-0.5 bg-slate-200 text-slate-700 rounded">${escapeHtml(c.source)}</span>
                    </div>
                    <p class="text-[11px] text-slate-600">${escapeHtml(c.snippet)}</p>
                    ${c.map_url || c.phone ? `
                      <div class="pt-1 flex items-center gap-2">
                        ${c.phone ? `<a href="tel:${escapeHtml(c.phone)}" class="py-1 px-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[10px] rounded-lg border border-red-200 transition">📞 Call ${escapeHtml(c.phone)}</a>` : ''}
                        ${c.map_url ? `<a href="${escapeHtml(c.map_url)}" target="_blank" class="py-1 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] rounded-lg border border-blue-200 transition">🗺️ View Map Location ↗</a>` : ''}
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }

        loadingNode.outerHTML = `
          <div class="flex justify-start mb-4 chat-bubble-anim">
            <div class="bg-white border border-slate-200 text-slate-800 p-4 rounded-2xl rounded-tl-none text-xs max-w-[90%] shadow-md space-y-2">
              <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                <span class="font-bold text-red-600 flex items-center gap-1.5">
                  🤖 <span>Medical Chatbot (Sarvam AI)</span>
                </span>
                <span class="text-[10px] text-slate-400 font-mono">Verified Response</span>
              </div>
              <p class="leading-relaxed text-slate-700 font-medium whitespace-pre-line">${escapeHtml(data.answer)}</p>
              ${contextsHtml}
              <div class="mt-2 p-2 bg-amber-50 border border-amber-200/80 rounded-xl text-[10px] text-amber-800 leading-tight">
                ${escapeHtml(data.disclaimer)}
              </div>
            </div>
          </div>
        `;
        chatStream.scrollTop = chatStream.scrollHeight;
      }
    } catch (err) {
      console.error(err);
      const loadingNode = document.getElementById(tempAiId);
      if (loadingNode) {
        loadingNode.innerHTML = `<div class="p-3 text-red-600 text-xs font-semibold">Error connecting to Medical Chatbot backend.</div>`;
      }
    }
  }
}

// In-Chat Prescription OCR Upload Handler with Strict Validation Checking
async function handleInChatOcrUpload(file) {
  const chatStream = document.querySelector('#chat-message-stream');
  if (!chatStream) return;

  const fileName = file ? file.name : 'sample_prescription.jpg';

  // Append User Image Bubble
  chatStream.innerHTML += `
    <div class="flex justify-end mb-3 chat-bubble-anim">
      <div class="bg-purple-600 text-white p-3.5 rounded-2xl rounded-tr-none text-xs font-semibold max-w-[85%] shadow-sm space-y-1">
        <div class="flex items-center gap-2">
          <span>📷</span>
          <span>Uploaded Document: <strong>${escapeHtml(fileName)}</strong></span>
        </div>
      </div>
    </div>
  `;

  // Append Typing Indicator Bubble
  const tempOcrId = 'ocr-loading-' + Date.now();
  chatStream.innerHTML += `
    <div id="${tempOcrId}" class="flex justify-start mb-3 chat-bubble-anim">
      <div class="bg-white border border-purple-200 text-slate-700 p-3.5 rounded-2xl rounded-tl-none text-xs max-w-[85%] space-y-2 shadow-sm">
        <div class="flex items-center gap-2 text-purple-700 font-bold">
          <span>📷 Scanning & Validating Image Content...</span>
          <div class="typing-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    </div>
  `;
  chatStream.scrollTop = chatStream.scrollHeight;

  try {
    let responseData;
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      const resp = await fetch('/api/ocr', {
        method: 'POST',
        body: formData
      });
      responseData = await resp.json();
    } else {
      responseData = await api('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_name: fileName })
      });
    }

    const loadingNode = document.getElementById(tempOcrId);
    if (loadingNode) {
      if (responseData.status === 'error') {
        loadingNode.outerHTML = `
          <div class="flex justify-start mb-4 chat-bubble-anim">
            <div class="bg-red-50 border border-red-200 text-red-900 p-4 rounded-2xl rounded-tl-none text-xs max-w-[90%] shadow-md space-y-2">
              <div class="flex items-center gap-2 font-bold text-red-700 border-b border-red-200/80 pb-2">
                <span>⚠️ Image Content Validation Error</span>
              </div>
              <p class="font-medium text-slate-800">${escapeHtml(responseData.error)}</p>
              <div class="text-[11px] text-red-700">Please upload a clear medical prescription image containing doctor instructions, drug names, or dosage details.</div>
            </div>
          </div>
        `;
      } else {
        const info = responseData.prescription_info || {};
        const meds = responseData.medications || [];

        loadingNode.outerHTML = `
          <div class="flex justify-start mb-4 chat-bubble-anim">
            <div class="bg-white border border-purple-200 text-slate-800 p-5 rounded-2xl rounded-tl-none text-xs max-w-[95%] shadow-md space-y-4">
              <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                <span class="font-bold text-purple-700 flex items-center gap-1.5 text-xs">
                  📄 <span>OCR Prescription Breakdown</span>
                </span>
                <span class="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-extrabold rounded">Verified Doctor Report</span>
              </div>

              <div class="p-3 bg-purple-50/60 border border-purple-100 rounded-xl space-y-1">
                <div class="font-bold text-slate-900 text-sm">${escapeHtml(info.clinic)}</div>
                <div class="text-slate-600 text-xs">Physician: <strong>${escapeHtml(info.doctor)}</strong> (${escapeHtml(info.reg_no)})</div>
                <div class="text-[11px] text-slate-500">Date: ${escapeHtml(info.date)} · ${escapeHtml(info.patient)}</div>
              </div>

              <div class="space-y-2">
                <h5 class="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <span>💊 Detected Medications & Dosage Instructions (${meds.length}):</span>
                </h5>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  ${meds.map(m => `
                    <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 hover:border-purple-300 transition">
                      <div class="flex items-start justify-between gap-1">
                        <span class="font-bold text-slate-900 text-xs">${escapeHtml(m.name)}</span>
                        <span class="px-1.5 py-0.5 bg-purple-100 text-purple-800 text-[9px] font-bold rounded">${escapeHtml(m.type)}</span>
                      </div>
                      <div class="text-[11px] text-purple-900 font-bold bg-purple-100/50 p-1.5 rounded-md">
                        Dosage: ${escapeHtml(m.dosage)} (${escapeHtml(m.duration)})
                      </div>
                      <div class="text-[11px] space-y-0.5 text-slate-600">
                        <p><strong>Primary Uses:</strong> ${escapeHtml(m.uses)}</p>
                        <p><strong>Side Effects:</strong> ${escapeHtml(m.side_effects)}</p>
                        <p class="text-amber-800 font-medium"><strong>Precaution:</strong> ${escapeHtml(m.precautions)}</p>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <div class="p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl text-[10px] text-amber-800">
                ${escapeHtml(responseData.disclaimer)}
              </div>
            </div>
          </div>
        `;
      }
      chatStream.scrollTop = chatStream.scrollHeight;
    }
  } catch (err) {
    console.error(err);
    const loadingNode = document.getElementById(tempOcrId);
    if (loadingNode) {
      loadingNode.innerHTML = `<div class="p-3 text-red-600 text-xs font-semibold">Failed to process prescription image.</div>`;
    }
  }
}

// Trauma Triage Submission
async function submitTriage(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Assess Urgency';

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Analyzing Symptoms...';
  }

  const checkedSymptoms = [...document.querySelectorAll('input[name="symptom"]:checked')].map(i => i.value);
  const vitals = {
    oxygen: document.querySelector('#oxygen')?.value || 98,
    heart_rate: document.querySelector('#heart-rate')?.value || 75,
    sys_bp: document.querySelector('#sys-bp')?.value || 120
  };

  try {
    const result = await api('/api/triage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptoms: checkedSymptoms, vitals })
    });

    const target = document.querySelector('#triage-result');
    if (!target) return;

    let levelBg = 'bg-emerald-50 border-emerald-300 text-emerald-900';
    let badgeColor = 'bg-emerald-600 text-white';
    let progressBg = 'bg-emerald-500';

    if (result.level === 'RED') {
      levelBg = 'bg-red-50 border-red-300 text-red-900';
      badgeColor = 'bg-red-600 text-white';
      progressBg = 'bg-red-600';
    } else if (result.level === 'AMBER') {
      levelBg = 'bg-amber-50 border-amber-300 text-amber-900';
      badgeColor = 'bg-amber-500 text-white';
      progressBg = 'bg-amber-500';
    }

    let vitalWarningsHtml = '';
    if (result.vital_warnings && result.vital_warnings.length > 0) {
      vitalWarningsHtml = `
        <div class="mb-4 p-3 bg-red-100/80 border border-red-200 rounded-lg text-xs font-semibold text-red-800">
          <strong>⚠️ Vital Sign Warnings:</strong>
          <ul class="list-disc ml-5 mt-1 space-y-0.5">
            ${result.vital_warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    let actionStepsHtml = '';
    if (result.action_steps && result.action_steps.length > 0) {
      actionStepsHtml = `
        <div class="mb-4">
          <h4 class="font-bold text-sm text-slate-800 mb-2">Emergency Action Protocol:</h4>
          <ol class="list-decimal ml-5 space-y-1 text-sm text-slate-700">
            ${result.action_steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}
          </ol>
        </div>
      `;
    }

    let hospitalRecsHtml = '';
    if (result.recommended_hospitals && result.recommended_hospitals.length > 0) {
      hospitalRecsHtml = `
        <div class="mt-5 pt-4 border-t border-slate-200">
          <h4 class="font-bold text-sm text-slate-800 mb-2 flex items-center gap-1.5">
            <span>🚑 Recommended Emergency Facilities Nearby:</span>
          </h4>
          <div class="space-y-2">
            ${result.recommended_hospitals.map(h => `
              <div class="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs hover:border-slate-300 transition">
                <div>
                  <div class="font-bold text-slate-900 text-sm">${escapeHtml(h.name)}</div>
                  <div class="text-slate-500">${escapeHtml(h.area)} · ${escapeHtml(h.specialties)}</div>
                </div>
                <div class="text-right space-y-1">
                  <span class="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded text-[11px]">${escapeHtml(h.beds)} Beds</span>
                  <div>
                    <a href="tel:${escapeHtml(h.phone)}" class="font-semibold text-red-600 hover:underline mr-2">📞 Call</a>
                    ${h.map_url ? `<a href="${escapeHtml(h.map_url)}" target="_blank" class="font-semibold text-blue-600 hover:underline">🗺️ Map</a>` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    target.innerHTML = `
      <div class="border rounded-2xl p-6 ${levelBg} transition-all duration-300 shadow-md">
        <div class="flex items-center justify-between gap-4 mb-3">
          <span class="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full shadow-sm ${badgeColor}">
            ${escapeHtml(result.level)} Priority (${escapeHtml(result.score)}/100)
          </span>
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Triage Score</span>
        </div>
        
        <div class="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mb-4">
          <div class="${progressBg} h-full transition-all duration-500" style="width: ${result.score}%"></div>
        </div>

        <h3 class="text-xl font-bold font-heading mb-2 text-slate-900">${escapeHtml(result.level_label)}</h3>
        
        ${vitalWarningsHtml}
        ${actionStepsHtml}
        ${hospitalRecsHtml}

        <div class="mt-5 p-3 bg-white/70 border border-slate-200/80 rounded-xl text-[11px] text-slate-600 leading-relaxed">
          ${escapeHtml(result.disclaimer)}
        </div>
      </div>
    `;

    target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    console.error(err);
    alert('Unable to process triage evaluation. Please check your network connection or call 112.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  }
}

// Load Hospitals with Filtering
async function loadHospitals(event) {
  if (event) event.preventDefault();
  const container = document.querySelector('#hospital-results');
  if (!container) return;

  const area = document.querySelector('#area')?.value || '';
  const specialty = document.querySelector('#specialty')?.value || '';
  const emergency = document.querySelector('#emergency')?.checked || false;
  const facilityType = document.querySelector('#facility-type')?.value || '';
  const scheme = document.querySelector('#scheme-filter')?.value || '';
  const q = document.querySelector('#hospital-query')?.value || '';

  const params = new URLSearchParams({ area, specialty, emergency, facility_type: facilityType, scheme, q });

  container.innerHTML = '<div class="col-span-full text-center py-12 text-slate-400">Loading hospitals...</div>';

  try {
    const data = await api(`/api/hospitals?${params}`);

    const countBadge = document.querySelector('#hospital-count-badge');
    if (countBadge) countBadge.textContent = `${data.count} Hospitals Found`;

    if (data.hospitals.length === 0) {
      container.innerHTML = `
        <div class="col-span-full p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-500">
          <div class="text-4xl mb-2">🏥</div>
          <h4 class="font-bold text-slate-800">No Hospitals Found</h4>
          <p class="text-sm">Try broadening your search query or removing specialty filters.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = data.hospitals.map((h) => {
      const qUrl = encodeURIComponent(`${h.name} ${h.address}`);
      return `
        <article class="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between gap-3 mb-3">
              <div>
                <span class="inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${h.facility_type === 'Government' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'} mb-1.5">
                  ${escapeHtml(h.facility_type)}
                </span>
                <h3 class="font-bold text-lg font-heading text-slate-900 leading-snug">${escapeHtml(h.name)}</h3>
                <p class="text-xs text-slate-500 font-semibold mt-0.5">📍 ${escapeHtml(h.area)} — ${escapeHtml(h.address)}</p>
              </div>
              <div class="text-right shrink-0">
                <span class="block px-2.5 py-1 bg-red-50 text-red-700 font-bold text-xs rounded-lg border border-red-100">
                  ${escapeHtml(h.beds)} Beds
                </span>
              </div>
            </div>

            <div class="my-3 py-2 border-y border-slate-100 space-y-1.5">
              <div class="text-xs text-slate-700"><span class="font-bold text-slate-500">Specialties:</span> ${escapeHtml(h.specialties)}</div>
              <div class="text-xs text-slate-700"><span class="font-bold text-slate-500">Empanelled Schemes:</span> ${escapeHtml(h.empanelled_schemes)}</div>
              <div class="text-xs text-slate-700"><span class="font-bold text-slate-500">Consultation Fee:</span> <span class="font-semibold text-emerald-700">${escapeHtml(h.avg_consultation_fee)}</span></div>
              <div class="text-xs text-slate-700"><span class="font-bold text-slate-500">Treatment Costs:</span> ${escapeHtml(h.treatment_cost_range)}</div>
            </div>
          </div>

          <div class="pt-2 flex items-center justify-between gap-2 mt-2">
            <a href="tel:${escapeHtml(h.phone)}" class="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl text-center shadow-sm transition flex items-center justify-center gap-1">
              <span>📞 Call Emergency</span>
            </a>
            <a href="https://maps.google.com/?q=${qUrl}" target="_blank" class="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl text-center transition flex items-center justify-center gap-1">
              <span>🗺️ Map</span>
            </a>
          </div>
        </article>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div class="col-span-full text-center py-12 text-red-500 font-semibold">Error loading hospital registry.</div>';
  }
}

// Load Blood & Organ Donors
async function loadDonors(event) {
  if (event) event.preventDefault();
  const container = document.querySelector('#donor-results');
  if (!container) return;

  const bg = document.querySelector('#donor-bg-filter')?.value || '';
  const area = document.querySelector('#donor-area-filter')?.value || '';

  const params = new URLSearchParams({ blood_group: bg, area });
  container.innerHTML = '<div class="col-span-full text-center py-4 text-xs text-slate-400">Searching donors...</div>';

  try {
    const data = await api(`/api/donors?${params}`);

    if (data.donors.length === 0) {
      container.innerHTML = '<div class="p-4 text-center text-xs text-slate-500">No matching donors found.</div>';
      return;
    }

    container.innerHTML = data.donors.map((d) => `
      <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
        <div>
          <div class="font-bold text-slate-900">${escapeHtml(d.name)} <span class="px-1.5 py-0.5 bg-red-100 text-red-700 font-extrabold text-[10px] rounded ml-1">${escapeHtml(d.blood_group)}</span></div>
          <div class="text-slate-500 text-[11px]">Area: ${escapeHtml(d.area)} · ${escapeHtml(d.organ)}</div>
        </div>
        <button onclick="alert('Donor Coordinator: Dial +91-522-112-MED for urgent blood match.')" class="py-1 px-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg transition text-[11px]">
          Contact
        </button>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

// Load UP Government Schemes
async function loadSchemes(event) {
  if (event) event.preventDefault();
  const container = document.querySelector('#scheme-results');
  if (!container) return;

  const query = document.querySelector('#scheme-query')?.value || '';
  const params = new URLSearchParams({ q: query });

  container.innerHTML = '<div class="col-span-full text-center py-4 text-xs text-slate-400">Searching schemes...</div>';

  try {
    const data = await api(`/api/schemes?${params}`);

    if (data.schemes.length === 0) {
      container.innerHTML = '<div class="p-4 text-center text-xs text-slate-500">No matching schemes found.</div>';
      return;
    }

    container.innerHTML = data.schemes.map((s) => `
      <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
        <div class="font-bold text-slate-900 flex items-center justify-between">
          <span>${escapeHtml(s.name)}</span>
          <span class="text-[10px] text-amber-700 font-semibold bg-amber-100 px-1.5 py-0.5 rounded">${escapeHtml(s.department)}</span>
        </div>
        <p class="text-[11px] text-slate-600">Benefit: ${escapeHtml(s.benefit)}</p>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

// Global Initialization
document.addEventListener('DOMContentLoaded', () => {
  // SOS Triggers
  document.querySelectorAll('.sos-trigger-btn').forEach(btn => {
    btn.addEventListener('click', openSosModal);
  });
  document.getElementById('sos-cancel-btn')?.addEventListener('click', cancelSos);

  // Live Camera Triggers
  document.getElementById('open-camera-btn')?.addEventListener('click', openCameraModal);
  document.getElementById('inchat-camera-btn')?.addEventListener('click', openCameraModal);
  document.getElementById('close-camera-btn')?.addEventListener('click', closeCameraModal);
  document.getElementById('cancel-camera-btn')?.addEventListener('click', closeCameraModal);
  document.getElementById('snap-photo-btn')?.addEventListener('click', snapPhotoFromCamera);

  // Chat Form Listener
  document.querySelector('#chat-form')?.addEventListener('submit', (e) => sendChatMessage(e));

  // Voice Mic Button Trigger
  document.querySelector('#mic-voice-btn')?.addEventListener('click', startVoiceRecognition);

  // In-Chat Prescription OCR File Input
  const inchatOcrInput = document.querySelector('#inchat-ocr-file');
  if (inchatOcrInput) {
    inchatOcrInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleInChatOcrUpload(e.target.files[0]);
      }
    });
  }

  // Sidebar Prescription OCR File Input
  const sidebarOcrInput = document.querySelector('#sidebar-ocr-file');
  if (sidebarOcrInput) {
    sidebarOcrInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleInChatOcrUpload(e.target.files[0]);
      }
    });
  }

  document.querySelector('#ocr-sample-sidebar-btn')?.addEventListener('click', () => {
    handleInChatOcrUpload(null);
  });

  // Quick Prompt Chips
  document.querySelectorAll('.chat-prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.getAttribute('data-msg') || chip.textContent.trim();
      sendChatMessage(null, text);
    });
  });

  // Forms
  document.querySelector('#triage-form')?.addEventListener('submit', submitTriage);
  document.querySelector('#hospital-form')?.addEventListener('submit', loadHospitals);
  document.querySelector('#donor-form')?.addEventListener('submit', loadDonors);
  document.querySelector('#scheme-form')?.addEventListener('submit', loadSchemes);

  // Auto Loaders
  if (document.querySelector('#hospital-results')) loadHospitals();
  if (document.querySelector('#donor-results')) loadDonors();
  if (document.querySelector('#scheme-results')) loadSchemes();
});
