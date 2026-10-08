/** Browser/server field validation for UI-managed communication settings; stored secrets may be retained. */
export function integrationErrors(value, { configured = false, smtpConfigured = false } = {}) {
  const errors = {};
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return { name: 'Enter integration settings.' };
  for (const key of [
    'smtpHost',
    'smtpFrom',
    'smtpUser',
    'smtpPassword',
    'url',
    'username',
    'password',
  ])
    if (value[key] !== undefined && typeof value[key] !== 'string')
      errors[key] = 'Enter a text value.';
  if (Object.keys(errors).length) return errors;
  if (value.commentNotifications !== undefined && typeof value.commentNotifications !== 'boolean')
    errors.commentNotifications = 'Choose whether comment notifications are enabled.';
  const required = (key, label, max) => {
    if (typeof value[key] !== 'string' || !value[key].trim()) errors[key] = `${label} is required.`;
    else if (value[key].length > max) errors[key] = `${label} must be ${max} characters or fewer.`;
  };
  required('name', 'Name', 80);
  if (!['email', 'slack', 'teams', 'servicenow'].includes(value.type))
    errors.type = 'Choose a supported app.';
  for (const key of ['enabled', 'recovery', 'onCall'])
    if (typeof value[key] !== 'boolean') errors[key] = 'Choose whether this option is enabled.';
  if (value.type === 'email') {
    required('recipients', 'Fallback recipients', 2500);
    const addresses =
      typeof value.recipients === 'string'
        ? value.recipients
            .split(',')
            .map((text) => text.trim())
            .filter(Boolean)
        : [];
    if (
      addresses.length > 10 ||
      addresses.some((email) => !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email))
    )
      errors.recipients = 'Enter up to 10 valid comma-separated email addresses.';
    if (
      !smtpConfigured ||
      value.smtpHost ||
      value.smtpFrom ||
      value.smtpUser ||
      value.smtpPassword
    ) {
      required('smtpHost', 'SMTP server', 253);
      required('smtpFrom', 'Sender email', 254);
      if (
        value.smtpHost &&
        (!/^[a-z0-9.-]+$/i.test(value.smtpHost) ||
          value.smtpHost.startsWith('.') ||
          value.smtpHost.endsWith('.') ||
          !value.smtpHost.includes('.'))
      )
        errors.smtpHost = 'Enter a public SMTP hostname, such as smtp.example.com.';
      if (![465, 587].includes(Number(value.smtpPort)))
        errors.smtpPort = 'Choose port 465 (TLS) or 587 (STARTTLS).';
      if (value.smtpFrom && !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(value.smtpFrom))
        errors.smtpFrom = 'Enter a valid sender email address.';
      if (value.smtpUser && !value.smtpPassword && !smtpConfigured)
        errors.smtpPassword = 'SMTP password is required when a username is supplied.';
      if (value.smtpUser?.length > 200)
        errors.smtpUser = 'SMTP username must be 200 characters or fewer.';
      if (value.smtpPassword?.length > 1000)
        errors.smtpPassword = 'SMTP password must be 1,000 characters or fewer.';
    }
  } else if (['slack', 'teams', 'servicenow'].includes(value.type)) {
    if (!configured || value.url) {
      required('url', value.type === 'servicenow' ? 'Instance URL' : 'Webhook URL', 4096);
      try {
        const url = new URL(value.url),
          host = url.hostname.toLowerCase();
        const allowed =
          value.type === 'slack'
            ? host === 'hooks.slack.com' && url.pathname.startsWith('/services/')
            : value.type === 'teams'
              ? [
                  '.environment.api.powerplatform.com',
                  '.logic.azure.com',
                  '.webhook.office.com',
                ].some((suffix) => host.endsWith(suffix))
              : host.endsWith('.service-now.com') && url.pathname === '/' && !url.search;
        if (
          !allowed ||
          url.protocol !== 'https:' ||
          (url.port && url.port !== '443') ||
          url.username ||
          url.password ||
          url.hash
        )
          errors.url = 'Use an official provider HTTPS URL.';
      } catch {
        if (!errors.url) errors.url = 'Enter a valid HTTPS URL.';
      }
    }
    if (value.type === 'servicenow' && !configured) {
      required('username', 'Integration username', 200);
      required('password', 'Integration password', 1000);
    }
  }
  return errors;
}
