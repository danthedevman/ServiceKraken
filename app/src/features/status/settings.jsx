import { Select } from '../../components/forms/select.jsx';
import { Toggle } from '../../components/forms/toggle.jsx';
import { StatusIconUpload } from './icon-upload.jsx';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FormPage } from '../../components/forms/form-page.jsx';
import { ActionMenu } from '../../components/action-menu.jsx';
import { ValidatedForm } from '../../components/forms/validated-form.jsx';
import { ReferenceField } from '../../components/forms/reference-field.jsx';
import { useResource } from '../../data/use-resource.js';
import { writeApi } from '../../data/query-client.js';
import { displayValue } from '../../lib/display-value.js';
import { statusMessage, STATUS_MESSAGE_LEVELS } from '../../../../shared/domain/status-messages.js';
import { StatusMessage } from './message.jsx';

const emptyMessage = () => ({ enabled: false, level: 'info', text: '' });

/** Admin settings retain drafts while background queries refresh. */
export function StatusSettings({ page = false }) {
  const settings = useResource('/status-settings');
  const services = useResource(page ? '/services' : null);
  if (!page)
    return (
      <ActionMenu label="Status page actions">
        <Link to="/status/settings">
          Status page settings ·{' '}
          {settings.data ? displayValue(settings.data.visibility) : 'Loading…'}
        </Link>
      </ActionMenu>
    );
  return (
    <FormPage title="Status page settings">
      {(settings.error || services.error) && <p role="alert">{settings.error || services.error}</p>}
      {settings.data && services.data ? (
        <StatusEditor settings={settings.data} services={services.data.services} />
      ) : (
        <p role="status">Loading status settings…</p>
      )}
    </FormPage>
  );
}

/** Publish explicitly, validating messages before sending the same bounded server payload. */
function StatusEditor({ settings, services }) {
  const navigate = useNavigate();
  const [initial] = useState(settings);
  const [visibility, setVisibility] = useState(settings.visibility);
  const [banner, setBanner] = useState(settings.banner ?? emptyMessage());
  const [messages, setMessages] = useState(() =>
    (settings.serviceMessages ?? []).filter((message) =>
      services.some((service) => service.id === message.serviceId),
    ),
  );
  const [serviceId, setServiceId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(event, reportErrors) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const body = {
        visibility,
        revision: initial.revision,
        banner: statusMessage(banner),
        serviceMessages: messages.map((message) => ({
          serviceId: message.serviceId,
          ...statusMessage(message, `service-${message.serviceId}`),
        })),
      };
      await writeApi('/status-settings', { method: 'PATCH', body });
      navigate('/status');
    } catch (failure) {
      setError(failure.message);
      reportErrors?.(failure.fields);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ValidatedForm kind="status" className="form-body" onSubmit={save}>
      {error && (
        <p role="alert" className="text-rose-700 dark:text-rose-400">
          {error}
        </p>
      )}
      <label className="field-label">
        Visibility
        <Select
          name="visibility"
          value={visibility}
          onChange={(event) => setVisibility(event.target.value)}
        >
          <option value="private">Private — signed-in workspace members</option>
          <option value="public">Public — anyone with the link</option>
        </Select>
      </label>
      <p className="text-sm text-slate-500">
        The public page has no sidebar or sign-in requirement. Published messages, service status,
        descriptions, dependencies, and uptime history are public. Monitoring URLs, response
        details, and account information stay private. Switching to private disables public access.
      </p>
      {initial.visibility === 'public' && (
        <a
          className="break-all text-sm text-blue-700 underline dark:text-blue-300"
          href={initial.publicPath}
          target="_blank"
          rel="noopener noreferrer"
        >
          View public status page ↗
        </a>
      )}
      <StatusIconUpload hasIcon={initial.hasStatusIcon} />
      <MessageEditor title="Global banner" value={banner} onChange={setBanner} />
      <section className="space-y-4">
        <h2 className="font-semibold">Service messages</h2>
        <ReferenceField
          referenceType="services"
          label="Add a service message"
          value={serviceId}
          options={services
            .filter((service) => !messages.some((message) => message.serviceId === service.id))
            .map((service) => ({ id: service.id, label: service.name }))}
          onChange={(id) => {
            setServiceId('');
            if (id) setMessages((current) => [...current, { serviceId: id, ...emptyMessage() }]);
          }}
        />
        {messages.map((message) => (
          <div
            key={message.serviceId}
            className="space-y-3 border-b border-slate-200 pb-5 dark:border-slate-700"
          >
            <MessageEditor
              title={
                services.find((service) => service.id === message.serviceId)?.name || 'Service'
              }
              value={message}
              onChange={(next) =>
                setMessages((current) =>
                  current.map((item) =>
                    item.serviceId === message.serviceId
                      ? { ...next, serviceId: item.serviceId }
                      : item,
                  ),
                )
              }
            />
            <button
              type="button"
              className="text-sm text-rose-700 dark:text-rose-400"
              onClick={() =>
                setMessages((current) =>
                  current.filter((item) => item.serviceId !== message.serviceId),
                )
              }
            >
              Remove message
            </button>
          </div>
        ))}
      </section>
      <p className="text-sm text-slate-500">
        Messages provide context and do not override measured service health. Changes appear
        publicly only after saving with public visibility.
      </p>
      <section className="space-y-2 text-sm">
        <h2 className="font-semibold">Custom domain</h2>
        <p>
          Point your domain at an HTTPS reverse proxy for this app. Route its homepage to{' '}
          <code className="break-all">{initial.publicPath}</code> and proxy the public API and
          assets. DNS alone cannot map a domain to a URL path. See the custom-domain example in the
          README.
        </p>
      </section>
      <div className="form-actions">
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          onClick={() => navigate('/status')}
        >
          Cancel
        </button>
        <button className="btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save status page'}
        </button>
      </div>
    </ValidatedForm>
  );
}

/** Consistent announcement controls and a live preview; never render administrator HTML. */
function MessageEditor({ title, value, onChange }) {
  return (
    <fieldset className="space-y-4">
      <legend className="font-semibold">{title}</legend>
      <label className="flex items-center gap-2 text-sm">
        <Toggle
          checked={value.enabled}
          onChange={(event) => onChange({ ...value, enabled: event.target.checked })}
        />
        Display message
      </label>
      <label className="field-label">
        Criticality
        <Select
          value={value.level}
          onChange={(event) => onChange({ ...value, level: event.target.value })}
        >
          {STATUS_MESSAGE_LEVELS.map((level) => (
            <option key={level} value={level}>
              {displayValue(level)}
            </option>
          ))}
        </Select>
      </label>
      <label className="field-label">
        Message{value.enabled ? ' *' : ''}
        <textarea
          rows={3}
          maxLength={1000}
          required={value.enabled}
          value={value.text}
          onChange={(event) => onChange({ ...value, text: event.target.value })}
        />
      </label>
      <StatusMessage message={value} compact />
    </fieldset>
  );
}
