(() => {
  'use strict';

  const form = document.getElementById('form-contacto');
  const SITE_KEY = '6LeQitsrAAAAABpomJy2dO34wPjG5oBXkP49d4CE'; // la site key es pública
  const actionInput = document.getElementById('recaptcha_action');
  const tokenInput  = document.getElementById('recaptcha_token');
  const submitBtn   = form?.querySelector('[type="submit"]');

  if (!form || !actionInput || !tokenInput) {
    console.error('Faltan elementos del formulario o inputs ocultos de reCAPTCHA.');
    return;
  }

  let submitting = false;

  form.addEventListener('submit', (event) => {
    // Validación Bootstrap
    if (!form.checkValidity()) {
      event.preventDefault();
      event.stopPropagation();
      form.classList.add('was-validated');
      return;
    }
    form.classList.add('was-validated');

    // Evitar doble envío
    if (submitting) {
      event.preventDefault();
      return;
    }

    // Ejecutar reCAPTCHA antes de enviar
    event.preventDefault();
    submitting = true;
    submitBtn?.setAttribute('disabled', 'true');

    const action = actionInput.value || 'contacto_enviar';

    // Verificar que grecaptcha esté disponible
    if (typeof grecaptcha === 'undefined' || !grecaptcha.execute) {
      submitting = false;
      submitBtn?.removeAttribute('disabled');
      alert('No se pudo cargar reCAPTCHA. Refresca la página e inténtalo de nuevo.');
      return;
    }

    grecaptcha.ready(async () => {
      try {
        // Por seguridad, corta si tarda demasiado (ej. bloqueo de red)
        const token = await Promise.race([
          grecaptcha.execute(SITE_KEY, { action }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
        ]);

        tokenInput.value = token;
        form.submit(); // ahora sí
      } catch (err) {
        console.warn('Error reCAPTCHA:', err);
        submitting = false;
        submitBtn?.removeAttribute('disabled');
        alert('No se pudo validar reCAPTCHA. Intenta de nuevo.');
      }
    });
  });
})();

