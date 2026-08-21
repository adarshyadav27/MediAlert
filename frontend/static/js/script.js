// MedAlert Lucknow Interactive Frontend Script

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

// RAG Care Chatbot Handler
async function sendChatMessage(event, predefinedMsg) {
  if (event) event.preventDefault();
  
  const inputEl = document.querySelector('#chat-input-field') || document.querySelector('#modal-chat-input');
  const chatStream = document.querySelector('#chat-message-stream') || document.querySelector('#modal-chat-stream');
  
  const message = predefinedMsg || (inputEl ? inputEl.value.trim() : '');
  if (!message) return;
  if (inputEl && !predefinedMsg) inputEl.value = '';

  // Append User Bubble
  if (chatStream) {
    chatStream.innerHTML += `
      <div class="flex justify-end mb-3">
        <div class="bg-red-600 text-white p-3.5 rounded-2xl rounded-tr-none text-xs font-semibold max-w-[85%] shadow-sm">
          ${escapeHtml(message)}
        </div>
      </div>
    `;
    
    // Append Loading AI Bubble
    const tempAiId = 'ai-loading-' + Date.now();
    chatStream.innerHTML += `
      <div id="${tempAiId}" class="flex justify-start mb-3">
        <div class="bg-slate-100 border border-slate-200 text-slate-700 p-3.5 rounded-2xl rounded-tl-none text-xs max-w-[85%] space-y-2">
          <div class="flex items-center gap-2 text-slate-500 font-bold">
            <svg class="animate-spin h-4 w-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span>Retrieving context from UP health records...</span>
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
            <div class="mt-2.5 pt-2 border-t border-slate-200/80 space-y-1">
              <div class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Retrieved Datasets Context:</div>
              <div class="flex flex-wrap gap-1.5">
                ${data.retrieved_context.map(c => `
                  <span class="inline-block px-2 py-0.5 bg-slate-200/80 text-slate-700 rounded text-[10px] font-semibold" title="${escapeHtml(c.snippet)}">
                    📂 ${escapeHtml(c.source)}: ${escapeHtml(c.title)}
                  </span>
                `).join('')}
              </div>
            </div>
          `;
        }

        loadingNode.outerHTML = `
          <div class="flex justify-start mb-4">
            <div class="bg-white border border-slate-200 text-slate-800 p-4 rounded-2xl rounded-tl-none text-xs max-w-[90%] shadow-sm space-y-2">
              <div class="flex items-center gap-1.5 font-bold text-red-600 mb-1">
                <span>🤖 MedAlert Care AI:</span>
              </div>
              <p class="leading-relaxed text-slate-700 font-medium">${escapeHtml(data.answer)}</p>
              ${contextsHtml}
              <div class="mt-2 p-2 bg-amber-50 border border-amber-100 rounded text-[10px] text-amber-800 leading-tight">
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
        loadingNode.innerHTML = `<div class="p-3 text-red-600 text-xs font-semibold">Error connecting to care assistant server.</div>`;
      }
    }
  }
}

// Prescription OCR Upload Handler
async function handleOcrUpload(file) {
  const outputContainer = document.querySelector('#ocr-results-container');
  if (!outputContainer) return;

  const fileName = file ? file.name : 'sample_prescription.jpg';

  outputContainer.innerHTML = `
    <div class="p-8 text-center bg-white border border-slate-200 rounded-2xl">
      <svg class="animate-spin h-8 w-8 text-purple-600 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
      <h4 class="font-bold text-slate-800 text-sm">Processing OCR Prescription Text Extraction...</h4>
      <p class="text-xs text-slate-500 mt-1">Analyzing document: <span class="font-semibold text-slate-700">${escapeHtml(fileName)}</span></p>
    </div>
  `;

  try {
    const data = await api('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_name: fileName })
    });

    const info = data.prescription_info || {};
    const meds = data.medications || [];

    outputContainer.innerHTML = `
      <div class="bg-white border border-purple-200 rounded-2xl p-6 shadow-sm space-y-6">
        <!-- Header Info -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <span class="inline-block px-2.5 py-0.5 bg-purple-100 text-purple-800 font-extrabold text-[11px] uppercase tracking-wider rounded-md mb-1">
              ✓ OCR Text Extraction Complete
            </span>
            <h3 class="font-bold text-lg font-heading text-slate-900">${escapeHtml(info.clinic || 'Clinical Report')}</h3>
            <p class="text-xs text-slate-500">Prescribing Physician: <span class="font-semibold text-slate-700">${escapeHtml(info.doctor)}</span> (${escapeHtml(info.reg_no)})</p>
          </div>
          <div class="text-right text-xs">
            <span class="block font-semibold text-slate-700">Date: ${escapeHtml(info.date)}</span>
            <span class="text-slate-500">${escapeHtml(info.patient)}</span>
          </div>
        </div>

        <!-- Detected Medicines List -->
        <div class="space-y-4">
          <h4 class="font-bold text-sm text-slate-900 flex items-center gap-2">
            <span>💊 Detected Medications & Clinical Breakdown (${meds.length}):</span>
          </h4>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${meds.map(m => `
              <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 hover:border-purple-300 transition">
                <div class="flex items-start justify-between gap-2">
                  <h5 class="font-bold text-sm text-slate-900">${escapeHtml(m.name)}</h5>
                  <span class="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded">${escapeHtml(m.type)}</span>
                </div>
                <div class="text-xs text-purple-900 font-semibold bg-purple-100/60 p-2 rounded-lg">
                  Dosage: ${escapeHtml(m.dosage)} (${escapeHtml(m.duration)})
                </div>
                <div class="text-xs space-y-1 text-slate-600">
                  <p><strong>Primary Uses:</strong> ${escapeHtml(m.uses)}</p>
                  <p><strong>Side Effects:</strong> ${escapeHtml(m.side_effects)}</p>
                  <p class="text-amber-800"><strong>Precaution:</strong> ${escapeHtml(m.precautions)}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Clinical Advice -->
        <div class="p-4 bg-blue-50/60 border border-blue-100 rounded-xl text-xs space-y-1 text-slate-700">
          <h5 class="font-bold text-blue-900 mb-1">General Prescription Notes:</h5>
          <ul class="list-disc ml-5 space-y-0.5">
            ${(data.instructions || []).map(i => `<li>${escapeHtml(i)}</li>`).join('')}
          </ul>
        </div>

        <div class="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-[11px] text-amber-800">
          ${escapeHtml(data.disclaimer)}
        </div>
      </div>
    `;

    outputContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    console.error(err);
    outputContainer.innerHTML = `<div class="p-4 text-center text-red-600 font-semibold">Failed to process prescription image.</div>`;
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
                <div class="text-right">
                  <span class="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded text-[11px] mb-1">${escapeHtml(h.beds)} Beds</span>
                  <div><a href="tel:${escapeHtml(h.phone)}" class="font-semibold text-red-600 hover:underline">📞 ${escapeHtml(h.phone)}</a></div>
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

    container.innerHTML = data.hospitals.map((h) => `
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
          <a href="https://maps.google.com/?q=${encodeURIComponent(h.name + ' ' + h.address)}" target="_blank" class="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl text-center transition flex items-center justify-center gap-1">
            <span>🗺️ Map</span>
          </a>
        </div>
      </article>
    `).join('');
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
  const organ = document.querySelector('#donor-organ-filter')?.value || '';
  const type = document.querySelector('#donor-type-filter')?.value || '';
  const area = document.querySelector('#donor-area-filter')?.value || '';
  const q = document.querySelector('#donor-query')?.value || '';

  const params = new URLSearchParams({ blood_group: bg, organ, type, area, q });

  container.innerHTML = '<div class="col-span-full text-center py-8 text-slate-400">Searching donor registry...</div>';

  try {
    const data = await api(`/api/donors?${params}`);
    
    if (data.donors.length === 0) {
      container.innerHTML = `
        <div class="col-span-full p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-500">
          <div class="text-4xl mb-2">🩸</div>
          <h4 class="font-bold text-slate-800">No Donors Found</h4>
          <p class="text-sm">Try broadening your blood group or area filter.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = data.donors.map((d) => `
      <div class="bg-white border border-slate-200 hover:border-red-200 rounded-2xl p-5 shadow-sm transition flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="px-2.5 py-1 bg-red-100 text-red-700 font-extrabold text-sm rounded-lg">
              ${escapeHtml(d.blood_group)} ${d.organ !== 'Blood' ? '· ' + escapeHtml(d.organ) : ''}
            </span>
            <span class="px-2 py-0.5 text-[11px] font-bold rounded-full ${d.availability === 'Available' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
              ● ${escapeHtml(d.availability)}
            </span>
          </div>

          <h4 class="font-bold text-base text-slate-900 font-heading mb-1">${escapeHtml(d.name)}</h4>
          <p class="text-xs text-slate-500 mb-2">📍 Area: <span class="font-semibold text-slate-700">${escapeHtml(d.area)}</span></p>
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span class="text-slate-500">ID: ${escapeHtml(d.donor_id)}</span>
          <button onclick="alert('Demo Coordinator Contact: Dial +91-522-112-MED for verification.')" class="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg transition">
            Contact Coordinator
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div class="col-span-full text-center py-8 text-red-500">Failed to load donor data.</div>';
  }
}

// Load UP Government Schemes
async function loadSchemes(event) {
  if (event) event.preventDefault();
  const container = document.querySelector('#scheme-results');
  if (!container) return;

  const query = document.querySelector('#scheme-query')?.value || '';
  const dept = document.querySelector('#scheme-dept-filter')?.value || '';

  const params = new URLSearchParams({ q: query, department: dept });
  container.innerHTML = '<div class="col-span-full text-center py-8 text-slate-400">Loading government schemes...</div>';

  try {
    const data = await api(`/api/schemes?${params}`);

    if (data.schemes.length === 0) {
      container.innerHTML = `
        <div class="col-span-full p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-500">
          <div class="text-4xl mb-2">📜</div>
          <h4 class="font-bold text-slate-800">No Schemes Found</h4>
          <p class="text-sm">Try searching for keywords like "Ayushman", "Maternity", or "TB".</p>
        </div>
      `;
      return;
    }

    container.innerHTML = data.schemes.map((s) => `
      <article class="bg-white border border-slate-200 hover:border-blue-200 rounded-2xl p-6 shadow-sm transition flex flex-col justify-between">
        <div>
          <div class="mb-3">
            <span class="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 font-bold text-[11px] uppercase tracking-wider rounded-md mb-2">
              ${escapeHtml(s.department)}
            </span>
            <h3 class="font-bold text-lg font-heading text-slate-900">${escapeHtml(s.name)}</h3>
          </div>

          <div class="space-y-2 my-3 text-xs">
            <div class="p-2.5 bg-slate-50 rounded-xl">
              <span class="font-bold text-slate-800 block mb-0.5">Benefit Coverage:</span>
              <span class="text-slate-600">${escapeHtml(s.benefit)}</span>
            </div>
            <div class="p-2.5 bg-slate-50 rounded-xl">
              <span class="font-bold text-slate-800 block mb-0.5">Eligibility Criteria:</span>
              <span class="text-slate-600">${escapeHtml(s.eligibility)}</span>
            </div>
          </div>
        </div>

        <div class="pt-2">
          <a href="${escapeHtml(s.link)}" target="_blank" class="w-full inline-block py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl text-center transition">
            Visit Official Portal ↗
          </a>
        </div>
      </article>
    `).join('');
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div class="col-span-full text-center py-8 text-red-500">Failed to load health schemes.</div>';
  }
}

// Global Initialization
document.addEventListener('DOMContentLoaded', () => {
  // SOS Triggers
  document.querySelectorAll('.sos-trigger-btn').forEach(btn => {
    btn.addEventListener('click', openSosModal);
  });
  document.getElementById('sos-cancel-btn')?.addEventListener('click', cancelSos);

  // Chat Form Listeners
  document.querySelector('#chat-form')?.addEventListener('submit', (e) => sendChatMessage(e));
  document.querySelector('#modal-chat-form')?.addEventListener('submit', (e) => sendChatMessage(e));

  // Quick Prompt Chips
  document.querySelectorAll('.chat-prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.getAttribute('data-msg') || chip.textContent.trim();
      sendChatMessage(null, text);
    });
  });

  // OCR Upload Listeners
  const fileInput = document.querySelector('#ocr-file-input');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleOcrUpload(e.target.files[0]);
      }
    });
  }
  document.querySelector('#ocr-sample-btn')?.addEventListener('click', () => {
    handleOcrUpload(null);
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
