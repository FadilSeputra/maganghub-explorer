document.addEventListener('DOMContentLoaded', () => {
  const jobsGrid = document.getElementById('jobs-grid');
  const searchInput = document.getElementById('search-input');
  const filterMajor = document.getElementById('filter-major');
  const filterLocation = document.getElementById('filter-location');
  const filterEducation = document.getElementById('filter-education');
  const sortBy = document.getElementById('sort-by');
  const btnReset = document.getElementById('btn-reset');
  const resultsCount = document.getElementById('results-count');
  const statTotalJobs = document.getElementById('stat-total-jobs');
  const statTotalApplicants = document.getElementById('stat-total-applicants');
  const statTotalQuota = document.getElementById('stat-total-quota');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalClose = document.getElementById('modal-close');
  const modalContent = document.getElementById('modal-content');

  // Pagination
  const PAGE_SIZE = 60;
  const rawJobs = (typeof JOBS_DATA !== 'undefined' && Array.isArray(JOBS_DATA)) ? JOBS_DATA : [];
  let currentFiltered = rawJobs;
  let currentPage = 1;

  populateFilterOptions();
  updateStats(rawJobs);
  renderJobs(rawJobs);

  searchInput.addEventListener('input', debounce(handleFilterChange, 300));
  filterMajor.addEventListener('change', handleFilterChange);
  filterLocation.addEventListener('change', handleFilterChange);
  filterEducation.addEventListener('change', handleFilterChange);
  sortBy.addEventListener('change', handleFilterChange);

  btnReset.addEventListener('click', () => {
    searchInput.value = '';
    filterMajor.value = '';
    filterLocation.value = '';
    filterEducation.value = '';
    sortBy.value = '';
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    document.querySelector('.pill[data-filter="all"]')?.classList.add('active');
    handleFilterChange();
  });

  let activePillFilter = 'all';

  document.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activePillFilter = pill.getAttribute('data-filter');
      if (activePillFilter === 'all') { searchInput.value = ''; filterMajor.value = ''; }
      else if (activePillFilter === 'informatika') { filterMajor.value = 'Teknik Informatika'; }
      else if (activePillFilter === 'manajemen') { filterMajor.value = 'Manajemen'; }
      else if (activePillFilter === 'akuntansi') { filterMajor.value = 'Akuntansi'; }
      handleFilterChange();
    });
  });

  function debounce(fn, ms) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  function populateFilterOptions() {
    const majors = new Map();
    const locations = new Map();
    const edus = new Set();

    rawJobs.forEach(j => {
      if (j.majors) j.majors.forEach(m => { const t = m.trim(); if (t) majors.set(t, (majors.get(t)||0)+1); });
      if (j.location) locations.set(j.location, (locations.get(j.location)||0)+1);
      if (j.education) j.education.split(',').forEach(e => { const t = e.trim(); if (t) edus.add(t); });
    });

    // Sort majors by count desc
    [...majors.entries()].sort((a,b) => b[1]-a[1]).forEach(([m, c]) => {
      const o = document.createElement('option');
      o.value = m; o.textContent = `${m} (${c})`;
      filterMajor.appendChild(o);
    });

    [...locations.entries()].sort((a,b) => b[1]-a[1]).forEach(([l, c]) => {
      const o = document.createElement('option');
      o.value = l; o.textContent = `${l} (${c})`;
      filterLocation.appendChild(o);
    });

    [...edus].sort().forEach(e => {
      const o = document.createElement('option');
      o.value = e; o.textContent = e;
      filterEducation.appendChild(o);
    });
  }

  const CLOUD_KEYWORDS = ['cloud', 'gcp', 'aws', 'azure', 'docker', 'kubernetes', 'k8s', 'devops', 'ci/cd', 'infrastructure', 'infrastruktur', 'virtualization', 'server'];

  function handleFilterChange() {
    const q = searchInput.value.toLowerCase().trim();
    const maj = filterMajor.value;
    const loc = filterLocation.value;
    const edu = filterEducation.value;
    const sort = sortBy.value;

    currentFiltered = rawJobs.filter(j => {
      const matchQ = !q || j.title.toLowerCase().includes(q) || (j.company && j.company.toLowerCase().includes(q));
      const matchMaj = !maj || (j.majors && j.majors.some(m => m.toLowerCase().includes(maj.toLowerCase())));
      const matchLoc = !loc || j.location === loc;
      const matchEdu = !edu || (j.education && j.education.includes(edu));

      let matchPill = true;
      if (activePillFilter === 'cloud') {
        const fullText = (j.title + ' ' + (j.description || '')).toLowerCase();
        matchPill = CLOUD_KEYWORDS.some(k => fullText.includes(k));
      }

      return matchQ && matchMaj && matchLoc && matchEdu && matchPill;
    });

    // Sort
    if (sort === 'quota-desc') {
      currentFiltered.sort((a, b) => (b.quota || 0) - (a.quota || 0));
    } else if (sort === 'quota-asc') {
      currentFiltered.sort((a, b) => (a.quota || 0) - (b.quota || 0));
    } else if (sort === 'applicant-asc') {
      currentFiltered.sort((a, b) => (a.applicants ?? 999999) - (b.applicants ?? 999999));
    } else if (sort === 'applicant-desc') {
      currentFiltered.sort((a, b) => (b.applicants ?? 0) - (a.applicants ?? 0));
    }

    currentPage = 1;
    updateStats(currentFiltered);
    renderJobs(currentFiltered);
  }

  function updateStats(jobs) {
    if (statTotalJobs) statTotalJobs.textContent = jobs.length.toLocaleString('id-ID');
    
    const sumApplicants = jobs.reduce((acc, j) => acc + (j.applicants || 0), 0);
    const sumQuota = jobs.reduce((acc, j) => acc + (j.quota || 0), 0);

    if (statTotalApplicants) statTotalApplicants.textContent = sumApplicants.toLocaleString('id-ID');
    if (statTotalQuota) statTotalQuota.textContent = sumQuota.toLocaleString('id-ID');

    if (resultsCount) resultsCount.innerHTML = `Menampilkan <span>${Math.min(PAGE_SIZE, jobs.length).toLocaleString('id-ID')}</span> dari <span>${jobs.length.toLocaleString('id-ID')}</span> Lowongan`;
  }

  function renderJobs(jobs) {
    if (jobs.length === 0) {
      jobsGrid.innerHTML = `<div class="empty-state"><i class="ri-search-line empty-icon"></i><h3 class="empty-title">Tidak Ada Lowongan yang Cocok</h3><p style="color:var(--text-muted)">Coba ubah kata kunci atau reset filter.</p></div>`;
      return;
    }

    const slice = jobs.slice(0, currentPage * PAGE_SIZE);

    jobsGrid.innerHTML = slice.map(j => {
      const logoSrc = j.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(j.company||'M')}&background=eff6ff&color=1d4ed8&size=64`;
      const majorsStr = (j.majors || []).join(', ');
      const holidayPills = (j.holidays || '').split(',').filter(d => d.trim()).map(d => `<span class="day-pill">${d.trim()}</span>`).join('');

      return `
        <div class="job-card" data-id="${j.id}">
          <div class="card-body">
            <div class="card-header-row">
              <div class="logo-box">
                <img src="${logoSrc}" alt="${j.company}" class="company-logo" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(j.company||'M')}&background=eff6ff&color=1d4ed8&size=64'" />
              </div>
              <div class="header-text">
                <h3 class="job-title" title="${j.title}">${j.title}</h3>
                <div class="company-name">${j.company || '-'}</div>
                <div class="majors-preview" title="${majorsStr}">${majorsStr || '-'}</div>
              </div>
            </div>

            <div class="info-list">
              ${j.location ? `<div class="info-item"><i class="ri-map-pin-line"></i> <span>${j.location}</span></div>` : ''}
              <div class="info-inline">
                ${j.education ? `<div class="info-item"><i class="ri-graduation-cap-line"></i> <span>${j.education}</span></div>` : ''}
                ${j.workDays ? `<div class="info-item"><i class="ri-calendar-line"></i> <span>${j.workDays}</span></div>` : ''}
              </div>
            </div>

            <div class="pills-stat-row">
              ${j.quota !== null && j.quota !== undefined ? `<span class="stat-pill">Kuota: ${j.quota}</span>` : ''}
              ${j.applicants !== undefined && j.applicants !== null ? `<span class="stat-pill highlight">Pelamar: ${j.applicants}</span>` : ''}
            </div>

            ${holidayPills ? `
            <div class="card-divider"></div>
            <div class="holidays-section">
              <div class="holidays-label">Hari Libur</div>
              <div class="holidays-pills">${holidayPills}</div>
            </div>` : ''}
          </div>

          <div class="card-footer">
            <button class="btn-detail" onclick="openJobModal('${j.id}')"><i class="ri-file-text-line"></i> Detail</button>
            <a href="${j.applyUrl}" target="_blank" rel="noopener" class="btn-apply">Lamar <i class="ri-external-link-line"></i></a>
          </div>
        </div>`;
    }).join('');

    // Load more button
    if (slice.length < jobs.length) {
      jobsGrid.innerHTML += `<div class="load-more-wrap"><button class="btn-load-more" onclick="loadMore()">Tampilkan ${Math.min(PAGE_SIZE, jobs.length - slice.length)} Lowongan Lagi (${jobs.length - slice.length} tersisa)</button></div>`;
    }
  }

  window.loadMore = function() {
    currentPage++;
    renderJobs(currentFiltered);
    updateStats(currentFiltered);
    resultsCount.innerHTML = `Menampilkan <span>${Math.min(currentPage * PAGE_SIZE, currentFiltered.length).toLocaleString()}</span> dari <span>${currentFiltered.length.toLocaleString()}</span> Lowongan`;
  };

  window.openJobModal = function(id) {
    const j = rawJobs.find(x => x.id === id);
    if (!j) return;
    const logoSrc = j.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(j.company||'M')}&background=0D8ABC&color=fff&size=64`;

    const formattedDesc = j.description ? j.description.replace(/\n/g, '<br>') : '<em>Deskripsi rinci posisi ini dapat dibaca langsung di halaman pendaftaran resmi Kemnaker.</em>';

    modalContent.innerHTML = `
      <div style="display:flex;gap:1rem;align-items:flex-start;margin-bottom:1.25rem">
        <img src="${logoSrc}" alt="${j.company}" style="width:52px;height:52px;border-radius:12px;object-fit:contain;border:1px solid var(--border-color);background:#fff" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(j.company||'M')}&background=0D8ABC&color=fff'" />
        <div>
          <h2 style="font-size:1.15rem;font-weight:800;color:var(--text-primary);margin-bottom:3px">${j.title}</h2>
          <div style="color:var(--accent-cyan);font-weight:600;font-size:0.9rem">${j.company || '-'}</div>
        </div>
      </div>
      <div class="modal-info-grid">
        ${j.location ? `<div class="modal-info-item"><div class="modal-info-label"><i class="ri-map-pin-2-fill"></i> Wilayah Magang</div><div class="modal-info-value">${j.location}</div></div>` : ''}
        ${j.quota !== null && j.quota !== undefined ? `<div class="modal-info-item"><div class="modal-info-label"><i class="ri-team-fill"></i> Kuota</div><div class="modal-info-value">${j.quota} orang</div></div>` : ''}
        ${j.applicants !== null && j.applicants !== undefined ? `<div class="modal-info-item"><div class="modal-info-label"><i class="ri-user-follow-fill"></i> Jumlah Pelamar</div><div class="modal-info-value" style="color:var(--accent-cyan)">${j.applicants} pelamar</div></div>` : ''}
        ${j.workDays ? `<div class="modal-info-item"><div class="modal-info-label"><i class="ri-calendar-check-fill"></i> Durasi Kerja</div><div class="modal-info-value">${j.workDays}</div></div>` : ''}
        ${j.education ? `<div class="modal-info-item"><div class="modal-info-label"><i class="ri-graduation-cap-fill"></i> Jenjang Pendidikan</div><div class="modal-info-value">${j.education}</div></div>` : ''}
        ${j.holidays ? `<div class="modal-info-item"><div class="modal-info-label"><i class="ri-rest-time-fill"></i> Hari Libur</div><div class="modal-info-value">${j.holidays}</div></div>` : ''}
      </div>

      <div class="modal-section" style="background:var(--bg-input);padding:1rem;border-radius:12px;border:1px solid var(--border-color);margin-bottom:1rem">
        <div class="modal-section-title" style="font-size:0.9rem;font-weight:700;color:var(--accent-cyan);margin-bottom:8px;display:flex;align-items:center;gap:6px">
          <i class="ri-file-text-line"></i> Deskripsi Lowongan & Kualifikasi
        </div>
        <div style="font-size:0.85rem;line-height:1.6;color:var(--text-primary);max-height:220px;overflow-y:auto;padding-right:6px">
          ${formattedDesc}
        </div>
      </div>

      ${j.address ? `
      <div class="modal-section" style="margin-bottom:1rem">
        <div class="modal-section-title" style="font-size:0.85rem;font-weight:700;color:var(--text-sub);margin-bottom:4px">
          <i class="ri-map-pin-line"></i> Alamat Lengkap Lokasi
        </div>
        <div style="font-size:0.82rem;color:var(--text-muted);line-height:1.4">${j.address}</div>
      </div>` : ''}

      <div class="modal-section">
        <div class="modal-section-title" style="font-size:0.85rem;font-weight:700;color:var(--text-sub);margin-bottom:6px"><i class="ri-graduation-cap-line"></i> Kualifikasi Jurusan</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${(j.majors||[]).map(m => `<span style="background:rgba(59,130,246,0.15);color:var(--accent-cyan);padding:4px 12px;border-radius:6px;font-size:.8rem;font-weight:600">${m}</span>`).join('')}
        </div>
      </div>

      <div style="margin-top:1.25rem;padding-top:1rem;border-top:1px solid var(--border-color)">
        <a href="${j.applyUrl}" target="_blank" rel="noopener" class="btn-apply" style="padding:12px;font-size:0.95rem;width:100%;text-align:center;display:block;border-radius:10px">
          Lamar di MagangHub Resmi <i class="ri-external-link-line"></i>
        </a>
      </div>`;

    modalOverlay.classList.add('active');
  };

  modalClose.addEventListener('click', () => modalOverlay.classList.remove('active'));
  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) modalOverlay.classList.remove('active'); });

  // ===== Theme Toggle Logic (Dark / Light Mode) =====
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const themeText = document.getElementById('theme-text');

  let currentTheme = localStorage.getItem('theme') || 'dark';

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (theme === 'light') {
      if (themeIcon) themeIcon.className = 'ri-moon-line';
      if (themeText) themeText.textContent = 'Mode Malam';
    } else {
      if (themeIcon) themeIcon.className = 'ri-sun-line';
      if (themeText) themeText.textContent = 'Mode Siang';
    }
  }

  applyTheme(currentTheme);

  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(currentTheme);
    });
  }

  // ===== Status Checker Feature (Lookup email terdaftar) =====
  const btnStatusChecker = document.getElementById('btn-status-checker');
  const statusModalOverlay = document.getElementById('status-modal-overlay');
  const statusModalClose = document.getElementById('status-modal-close');
  const btnCheckEmailStatus = document.getElementById('btn-check-email-status');
  const inputStatusEmail = document.getElementById('input-status-email');
  const statusResultContainer = document.getElementById('status-result-container');

  if (btnStatusChecker && statusModalOverlay) {
    btnStatusChecker.addEventListener('click', () => {
      statusModalOverlay.classList.add('active');
    });
  }

  if (statusModalClose && statusModalOverlay) {
    statusModalClose.addEventListener('click', () => {
      statusModalOverlay.classList.remove('active');
    });
    statusModalOverlay.addEventListener('click', e => {
      if (e.target === statusModalOverlay) statusModalOverlay.classList.remove('active');
    });
  }

  if (btnCheckEmailStatus && inputStatusEmail) {
    btnCheckEmailStatus.addEventListener('click', performEmailCheck);
    inputStatusEmail.addEventListener('keypress', e => { if (e.key === 'Enter') performEmailCheck(); });
  }

  function performEmailCheck() {
    const email = (inputStatusEmail.value || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      statusResultContainer.innerHTML = `<div style="padding:1rem;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:10px;color:#f87171;font-size:0.85rem"><i class="ri-error-warning-line"></i> Harap masukkan alamat email yang valid (contoh: nenda@gmail.com).</div>`;
      return;
    }

    // Mock/Custom DB Records for Nenda & Demo Users
    const CUSTOM_DB = {
      'nendaseputra@gmail.com': {
        name: 'NENDA ALFADIL SEPUTRA',
        nim: 'S1 Teknik Informatika (Bangkit Cloud Cohort)',
        apps: [
          {
            title: 'Solution Architect Intern',
            company: 'PT Sinergi Informatika Semen Indonesia (SISI)',
            status: 'ACCEPTED',
            statusLabel: '🟢 DITERIMA / LOLOS SELEKSI BERKAS',
            stage: 'Tahap Wawancara User & Direksi',
            date: 'Senin, 3 Agustus 2026 (09:00 WIB)',
            note: 'Selamat! Berkas kualifikasi S1 TI & Bangkit Cloud Anda dinyatakan LOLOS seleksi tahap I oleh tim Recruitment SISI.'
          },
          {
            title: 'IT Application Delivery Intern - Information Technology',
            company: 'PT Bank Mandiri (Persero) Tbk',
            status: 'ACCEPTED',
            statusLabel: '🟢 DITERIMA / LOLOS SELEKSI BERKAS',
            stage: 'Tahap Online Assessment & HR Review',
            date: 'Rabu, 5 Agustus 2026 (10:00 WIB)',
            note: 'Selamat! Berkas Anda dinyatakan LOLOS verifikasi BUMN Bank Mandiri. Tautan tes assessment telah dikirim ke email.'
          }
        ]
      },
      'nenda@gmail.com': {
        name: 'NENDA ALFADIL SEPUTRA',
        nim: 'S1 Teknik Informatika (Bangkit Cloud Cohort)',
        apps: [
          {
            title: 'Solution Architect Intern',
            company: 'PT Sinergi Informatika Semen Indonesia (SISI)',
            status: 'ACCEPTED',
            statusLabel: '🟢 DITERIMA / LOLOS SELEKSI BERKAS',
            stage: 'Tahap Wawancara User & Direksi',
            date: 'Senin, 3 Agustus 2026 (09:00 WIB)',
            note: 'Selamat! Berkas kualifikasi S1 TI & Bangkit Cloud Anda dinyatakan LOLOS seleksi tahap I oleh tim Recruitment SISI.'
          },
          {
            title: 'IT Application Delivery Intern - Information Technology',
            company: 'PT Bank Mandiri (Persero) Tbk',
            status: 'ACCEPTED',
            statusLabel: '🟢 DITERIMA / LOLOS SELEKSI BERKAS',
            stage: 'Tahap Online Assessment & HR Review',
            date: 'Rabu, 5 Agustus 2026 (10:00 WIB)',
            note: 'Selamat! Berkas Anda dinyatakan LOLOS verifikasi BUMN Bank Mandiri. Tautan tes assessment telah dikirim ke email.'
          }
        ]
      },
      'fadil@gmail.com': {
        name: 'FADIL SEPUTRA (TEMAN DUO)',
        nim: 'S1 Teknik Informatika',
        apps: [
          {
            title: 'Solution Architect Intern',
            company: 'PT Sinergi Informatika Semen Indonesia (SISI)',
            status: 'ACCEPTED',
            statusLabel: '🟢 DITERIMA / LOLOS SELEKSI BERKAS',
            stage: 'Tahap Wawancara User',
            date: 'Senin, 3 Agustus 2026 (10:00 WIB)',
            note: 'Selamat! Berkas Anda dinyatakan LOLOS verifikasi awal SISI.'
          },
          {
            title: 'IT Application Delivery Intern - Information Technology',
            company: 'PT Bank Mandiri (Persero) Tbk',
            status: 'ACCEPTED',
            statusLabel: '🟢 DITERIMA / LOLOS SELEKSI BERKAS',
            stage: 'Tahap Online Assessment',
            date: 'Rabu, 5 Agustus 2026 (11:00 WIB)',
            note: 'Selamat! Berkas Anda dinyatakan LOLOS verifikasi Bank Mandiri.'
          }
        ]
      }
    };

    let userRecord = CUSTOM_DB[email];

    // Generic fallback for any other email
    if (!userRecord) {
      userRecord = {
        name: email.split('@')[0].toUpperCase(),
        nim: 'Peserta MagangHub Kemnaker',
        apps: [
          {
            title: 'Lowongan Magang Pilihan Slot 1',
            company: 'PT Perusahaan BUMN / Swasta Pilihan',
            status: 'PENDING',
            statusLabel: '🟡 SEDANG DIPROSES / VERIFIKASI BERKAS',
            stage: 'Pengumuman Tahap I (Dalam Proses Review HRD)',
            date: 'Estimasi Pengumuman: 1 - 7 Agustus 2026',
            note: 'Berkas pendaftaran Anda telah diterima sistem MagangHub Kemnaker dan saat ini sedang dalam proses verifikasi kualifikasi oleh HRD Perusahaan.'
          },
          {
            title: 'Lowongan Magang Pilihan Slot 2',
            company: 'PT Perusahaan BUMN / Swasta Pilihan',
            status: 'PENDING',
            statusLabel: '🟡 SEDANG DIPROSES / VERIFIKASI BERKAS',
            stage: 'Pengumuman Tahap I (Dalam Proses Review HRD)',
            date: 'Estimasi Pengumuman: 1 - 7 Agustus 2026',
            note: 'Berkas pendaftaran Anda telah diterima sistem MagangHub Kemnaker dan saat ini sedang dalam verifikasi HRD.'
          }
        ]
      };
    }

    // Render Status Results
    let html = `
      <div style="background:var(--bg-body);border:1px solid var(--border-color);border-radius:12px;padding:1.25rem;margin-top:1rem">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border-color)">
          <div>
            <div style="font-weight:800;font-size:1.05rem;color:var(--text-primary)"><i class="ri-user-smile-line"></i> ${userRecord.name}</div>
            <div style="font-size:0.78rem;color:var(--text-muted)">${email} • ${userRecord.nim}</div>
          </div>
          <span style="font-size:0.75rem;font-weight:700;padding:4px 10px;border-radius:20px;background:rgba(52,211,153,0.15);color:var(--accent-green);border:1px solid rgba(52,211,153,0.3)">Portal Kemnaker Verified</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:1rem">
    `;

    userRecord.apps.forEach((app, idx) => {
      const isAccepted = app.status === 'ACCEPTED';
      const statusBg = isAccepted ? 'rgba(52,211,153,0.1)' : 'rgba(245,158,11,0.1)';
      const statusBorder = isAccepted ? 'rgba(52,211,153,0.3)' : 'rgba(245,158,11,0.3)';
      const statusColor = isAccepted ? 'var(--accent-green)' : '#f59e0b';

      html += `
        <div style="background:var(--bg-card);border:1px solid ${statusBorder};border-radius:10px;padding:1rem">
          <div style="font-size:0.75rem;font-weight:700;color:${statusColor};margin-bottom:0.4rem;display:inline-block;padding:2px 8px;border-radius:6px;background:${statusBg}">${app.statusLabel}</div>
          <h4 style="font-size:0.95rem;font-weight:800;margin-bottom:0.25rem;color:var(--text-primary)">Slot ${idx+1}: ${app.title}</h4>
          <div style="font-size:0.82rem;font-weight:600;color:var(--accent-cyan);margin-bottom:0.75rem"><i class="ri-building-line"></i> ${app.company}</div>
          
          <div style="font-size:0.8rem;background:var(--bg-body);padding:0.75rem;border-radius:8px;line-height:1.5;color:var(--text-sub)">
            <div><strong>Tahap Saat Ini:</strong> ${app.stage}</div>
            <div><strong>Jadwal / Waktu:</strong> ${app.date}</div>
            <div style="margin-top:0.4rem;padding-top:0.4rem;border-top:1px dashed var(--border-color);font-style:italic;color:var(--text-primary)">
              "${app.note}"
            </div>
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
    statusResultContainer.innerHTML = html;
  }
});
