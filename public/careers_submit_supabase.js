// /public/js/careers_submit_supabase.js
// @ts-nocheck  // why: this is browser JS; disable TS JSX checks in mixed projects

// ===== Replace with your real Supabase values =====
const SUPABASE_URL = 'https://fhiivigvbopjgnwmzbnj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoaWl2aWd2Ym9wamdud216Ym5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzOTIyMDUsImV4cCI6MjA4MDk2ODIwNX0.qGNBiksmCfXtKWV-malZRmjGEfmuedAkV8K_NArlbKM';

// Guard: make sure supabase UMD is loaded before this file
if (typeof supabase === 'undefined') {
  console.error('[Careers] Supabase library not found. Add the UMD script tag before this file.');
} else {
  var sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

(function wireCareersForm() {
  const form         = document.getElementById('careerForm');
  const cvInput      = document.getElementById('cvInput');
  const certInput    = document.getElementById('certInput');
  const successModal = document.getElementById('successModal');
  const successClose = document.getElementById('successClose');
  const formMsg      = document.getElementById('formMsg');
  const submitBtn    = document.getElementById('submitBtn');

  if (!form || !cvInput) {
    console.warn('[Careers] required elements not found'); 
    return;
  }
  if (!sb) return;

  // tiny helpers (only 'why' comments)
  const msg = (t, ok=false) => {
    if (!formMsg) return;
    formMsg.textContent = t || '';
    formMsg.className   = 'text-xs ' + (ok ? 'text-[var(--primary)]' : 'text-rose-300');
  };
  const clearMsg = () => msg('', true);

  async function uploadFile(path, file) {
    // why: policy allows write only under careers/public/*
    const { error } = await sb.storage.from('careers').upload(path, file, { upsert: false });
    if (error) throw error;
    return path;
  }

  async function submitApplication(meta, cvFile, certFiles) {
    const id = crypto.randomUUID(); // why: stable folder id == row id

    // CV
    const ext   = (cvFile.name.split('.').pop() || 'bin').toLowerCase();
    const cvRel = `public/${id}/cv.${ext}`;
    await uploadFile(cvRel, cvFile);

    // Certificates
    const certRel = [];
    for (const f of (certFiles || [])) {
      const e = (f.name.split('.').pop() || 'bin').toLowerCase();
      const p = `public/${id}/certs/${crypto.randomUUID()}.${e}`;
      await uploadFile(p, f);
      certRel.push(p);
    }

    // DB insert
    const row = {
      id,
      full_name: meta.full_name,
      email: meta.email,
      phone: meta.phone,
      role: meta.role,
      experience_years: meta.experience_years ?? null,
      location: meta.location ?? null,
      portfolio_url: meta.portfolio_url || null,
      instagram: meta.instagram || null,
      videos: meta.videos || [],
      cover_note: meta.cover_note || null,
      cv_path: `careers/${cvRel}`,
      cert_paths: certRel.map(p => `careers/${p}`),
      status: 'new'
    };
    const { error } = await sb.from('applications').insert(row);
    if (error) throw error;
    return id;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const cvFile    = cvInput.files?.[0];
    const certFiles = certInput ? Array.from(certInput.files || []) : [];
    if (!cvFile) { msg('Please upload your CV.'); return; }

    const meta = {
      full_name:       form.full_name?.value?.trim(),
      email:           form.email?.value?.trim(),
      phone:           form.phone?.value?.trim(),
      role:            form.role?.value?.trim(),
      experience_years: form.experience_years?.value ? Number(form.experience_years.value) : null,
      location:        form.location?.value?.trim() || null,
      portfolio_url:   form.portfolio_url?.value?.trim() || null,
      instagram:       form.instagram?.value?.trim() || null,
      videos:          [form.video_1?.value, form.video_2?.value, form.video_3?.value].filter(Boolean),
      cover_note:      form.cover_note?.value?.trim() || null
    };

    // quick required check
    for (const [k, v] of Object.entries({full_name:meta.full_name, email:meta.email, phone:meta.phone, role:meta.role})) {
      if (!v) { msg(`Please fill ${k.replace('_',' ')}.`); return; }
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Uploading…';
      clearMsg();

      await submitApplication(meta, cvFile, certFiles);

      // success
      if (successModal) {
        successModal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
      }
      form.reset();
      msg('Application submitted.', true);
    } catch (err) {
      console.error(err);
      msg(err.message || 'Submission failed.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Application';
    }
  });

  successClose?.addEventListener('click', () => {
    successModal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  });
  successModal?.addEventListener('click', (e) => { if (e.target === successModal) successClose?.click(); });
})();

// ===== Add these two tags to your HTML, before </body> =====
// 1) Supabase UMD
// <script src="https://unpkg.com/@supabase/supabase-js@2.47.10/dist/umd/supabase.js"></script>
// 2) Your file (after UMD):
// <script src="/public/js/careers_submit_supabase.js"></script>
