import { useState } from 'react'
import type { UICopy } from '../i18n'
import { CITIES, DEFAULT_PROFILE, saveProfile, type BirthProfile } from '../lib/profile'
import type { ReadingLanguage } from '../types'

interface ProfileFormProps {
  copy: UICopy
  language: ReadingLanguage
  initial: BirthProfile | null
  onSaved: (profile: BirthProfile) => void
  /** Only the fields a practice needs; feng shui needs no time or place. */
  fields?: ('time' | 'place')[]
}

export function ProfileForm({ copy, language, initial, onSaved, fields = ['time', 'place'] }: ProfileFormProps) {
  const [profile, setProfile] = useState<BirthProfile>(initial ?? DEFAULT_PROFILE)
  const [customPlace, setCustomPlace] = useState(false)
  const l = language === 'en' ? 'en' : 'zh'
  const update = (patch: Partial<BirthProfile>) => setProfile((current) => ({ ...current, ...patch }))
  const t = copy.profile

  const chooseCity = (index: number) => {
    const city = CITIES[index]
    if (!city) return
    update({ place: city.name[l], latitude: city.latitude, longitude: city.longitude, utcOffsetHours: city.utcOffsetHours })
  }
  const cityIndex = CITIES.findIndex((c) => c.latitude === profile.latitude && c.longitude === profile.longitude)

  return (
    <form
      className="panel profile-form"
      onSubmit={(event) => {
        event.preventDefault()
        saveProfile(profile)
        onSaved(profile)
      }}
      data-testid="profile-form"
    >
      <h2>{t.title}</h2>
      <p className="body">{t.body}</p>
      <div className="field-row">
        <label className="field">
          <span>{t.year}</span>
          <input type="number" min={1900} max={2100} value={profile.year} onChange={(e) => update({ year: Number(e.target.value) })} data-testid="profile-year" />
        </label>
        <label className="field">
          <span>{t.month}</span>
          <input type="number" min={1} max={12} value={profile.month} onChange={(e) => update({ month: Number(e.target.value) })} data-testid="profile-month" />
        </label>
        <label className="field">
          <span>{t.day}</span>
          <input type="number" min={1} max={31} value={profile.day} onChange={(e) => update({ day: Number(e.target.value) })} data-testid="profile-day" />
        </label>
      </div>
      {fields.includes('time') && (
        <>
          <div className="field-row">
            <label className="field">
              <span>{t.hour}</span>
              <input type="number" min={0} max={23} value={profile.hour} disabled={!profile.timeKnown} onChange={(e) => update({ hour: Number(e.target.value) })} data-testid="profile-hour" />
            </label>
            <label className="field">
              <span>{t.minute}</span>
              <input type="number" min={0} max={59} value={profile.minute} disabled={!profile.timeKnown} onChange={(e) => update({ minute: Number(e.target.value) })} />
            </label>
          </div>
          <label className="switch">
            <input type="checkbox" checked={!profile.timeKnown} onChange={(e) => update({ timeKnown: !e.target.checked, hour: e.target.checked ? 12 : profile.hour, minute: e.target.checked ? 0 : profile.minute })} />
            <span>{t.timeUnknown}</span>
          </label>
        </>
      )}
      <div className="field">
        <span>{t.gender}</span>
        <div className="chip-row" role="group" aria-label={t.gender}>
          {(['female', 'male'] as const).map((g) => (
            <button key={g} type="button" className={profile.gender === g ? 'chip active' : 'chip'} aria-pressed={profile.gender === g} onClick={() => update({ gender: g })} data-testid={`profile-${g}`}>
              {t[g]}
            </button>
          ))}
        </div>
      </div>
      {fields.includes('place') && (
        <label className="field">
          <span>{t.place}</span>
          {customPlace ? (
            <div className="field-row">
              <input type="number" step="0.01" value={profile.latitude} onChange={(e) => update({ latitude: Number(e.target.value) })} placeholder={t.latitude} aria-label={t.latitude} />
              <input type="number" step="0.01" value={profile.longitude} onChange={(e) => update({ longitude: Number(e.target.value) })} placeholder={t.longitude} aria-label={t.longitude} />
              <input type="number" step="0.5" value={profile.utcOffsetHours} onChange={(e) => update({ utcOffsetHours: Number(e.target.value) })} placeholder="UTC±" aria-label={t.utcOffset} />
            </div>
          ) : (
            <select value={cityIndex} onChange={(e) => chooseCity(Number(e.target.value))} data-testid="profile-city">
              {cityIndex < 0 && <option value={-1}>{profile.place || t.place}</option>}
              {CITIES.map((city, index) => (
                <option key={city.name.en} value={index}>
                  {city.name[l]}
                </option>
              ))}
            </select>
          )}
          <button type="button" className="link-button" onClick={() => setCustomPlace((v) => !v)}>
            {customPlace ? t.pickCity : t.enterCoordinates}
          </button>
        </label>
      )}
      <button type="submit" className="primary-button" data-testid="profile-save">
        {t.save}
      </button>
    </form>
  )
}
