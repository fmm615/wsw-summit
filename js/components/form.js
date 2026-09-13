/**
 * PERSONALIZATION FORM
 * ====================
 * Everyone opens the *same* link and fills in (or signs in to fill in)
 * their own details here. Name and photo can come from LinkedIn
 * automatically; title and company are always typed, because LinkedIn's
 * basic sign-in doesn't expose either (see the note in
 * api/auth/callback.js).
 *
 * Every field stays editable no matter where its value came from — someone
 * who signs in with LinkedIn can still fix their name before sharing.
 */

export function renderForm(profile) {
  return `
    <section class="form">
      <h2 class="form__title">Personalize your card</h2>

      <button type="button" class="btn btn--linkedin form__linkedin" id="form-linkedin">
        ${linkedInIcon()} Fill in with LinkedIn
      </button>
      <p class="form__linkedin-note">Pulls your name and photo automatically. You can still edit everything below.</p>
      <p class="form__linkedin-disclaimer">You'll sign in on LinkedIn's own site — we never see your password. This also lets you publish directly to your LinkedIn profile later if you choose to (you'll always get a separate confirmation before anything is actually posted). Sign in at your discretion; we're not responsible for issues on LinkedIn's end.</p>
      <div id="linkedin-unavailable-note" hidden></div>

      <div class="form__grid">
        <div class="form__field form__field--photo">
          <span class="form__label">Your photo</span>
          <div class="form__photo-row">
            <label class="btn btn--outline form__photo-upload" for="field-photo">Upload photo</label>
            <input type="file" id="field-photo" accept="image/png, image/jpeg, image/webp" hidden />
            <button type="button" class="form__photo-remove" id="photo-remove" ${profile.photo ? "" : "hidden"}>Remove</button>
          </div>
          <p class="form__photo-status" id="photo-status">${photoStatusText(!!profile.photo)}</p>
        </div>

        <label class="form__field">
          <span class="form__label">Full name</span>
          <input type="text" id="field-name" placeholder="e.g. Sara Salami" value="${escapeAttr(profile.fullName)}" autocomplete="name" />
        </label>

        <label class="form__field">
          <span class="form__label">Job title</span>
          <input type="text" id="field-title" placeholder="e.g. Marketing & Community Manager" value="${escapeAttr(profile.jobTitle)}" autocomplete="organization-title" />
        </label>

        <label class="form__field">
          <span class="form__label">Company</span>
          <input type="text" id="field-company" placeholder="e.g. Playbook" value="${escapeAttr(profile.company)}" autocomplete="organization" />
        </label>
      </div>
    </section>
  `;
}

function escapeAttr(str) {
  return (str ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function photoStatusText(hasPhoto) {
  return hasPhoto
    ? "Photo added — see your card below."
    : "No photo yet — your initials will show until you add one or sign in with LinkedIn.";
}

/**
 * Keeps the "Remove" button and status line in sync with profile.photo.
 * Call this any time the photo changes, whether that's from the file
 * input below, from LinkedIn auto-fill, or from someone removing it.
 */
export function updatePhotoUI(hasPhoto) {
  const removeBtn = document.getElementById("photo-remove");
  const status = document.getElementById("photo-status");
  if (removeBtn) removeBtn.hidden = !hasPhoto;
  if (status) status.textContent = photoStatusText(hasPhoto);
}

/**
 * Marks "Fill in with LinkedIn" as not wired up on this deployment (e.g. a
 * static-only host with no /api functions, or the LinkedIn env vars just
 * haven't been set yet). Instead of sending someone to a dead/broken URL,
 * clicking the button shows an inline explanation. See js/app.js, which
 * detects this once at load via a probe request to /api/me.
 */
export function markLinkedInUnavailable() {
  const btn = document.getElementById("form-linkedin");
  if (btn) btn.dataset.unavailable = "true";
}

function linkedInIcon() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45z"/></svg>`;
}

/**
 * Wires the form's inputs. Calls onChange(patch) with just the field(s)
 * that changed, on every keystroke/selection — the caller owns merging
 * that into the profile and re-rendering the preview.
 */
export function mountForm(onChange) {
  const bind = (id, key) => {
    const el = document.getElementById(id);
    el?.addEventListener("input", () => onChange({ [key]: el.value }));
  };
  bind("field-name", "fullName");
  bind("field-title", "jobTitle");
  bind("field-company", "company");

  document.getElementById("form-linkedin")?.addEventListener("click", (e) => {
    const btn = document.getElementById("form-linkedin");
    if (btn?.dataset.unavailable === "true") {
      const note = document.getElementById("linkedin-unavailable-note");
      if (note) {
        note.hidden = false;
        note.innerHTML =
          '<p class="form__demo-note"><strong>LinkedIn sign-in isn’t set up on this deployment yet.</strong> ' +
          "It needs a LinkedIn app and a server that can hold its secret — see LINKEDIN_SETUP.md in the project files. " +
          "Everything else on this page works right now.</p>";
      }
      return;
    }
    window.location.href = "/api/auth/linkedin";
  });

  // Manual photo upload — works regardless of LinkedIn, and overrides
  // whatever's already there (including a LinkedIn-filled photo).
  document.getElementById("field-photo")?.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ photo: reader.result });
    reader.readAsDataURL(file);
  });

  document.getElementById("photo-remove")?.addEventListener("click", () => {
    const fileInput = document.getElementById("field-photo");
    if (fileInput) fileInput.value = "";
    onChange({ photo: null });
  });
}
