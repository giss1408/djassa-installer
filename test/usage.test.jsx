import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import Usage from '../src/pages/Usage.jsx'
import { signInAs } from './server.js'

const summary = (app) => ({
  app,
  days: 30,
  installs_total: 120,
  installs_in_period: 40,
  active_installs_1d: 12,
  active_installs_7d: 55,
  active_installs_30d: 90,
  events: [{ key: 'app_open', count: 300, installs: 90 }],
  screens: [{ key: 'home', count: 250, installs: 88 }],
  venues_viewed: app === 'user' ? [{ id: 3, name: 'Chez Tantie Awa', views: 17, installs: 9 }] : [],
  deals_opened: [],
  merchants:
    app === 'retailer'
      ? [
          {
            venue_id: 3, venue_name: 'Chez Tantie Awa', last_seen: '2026-10-23T18:00:00', app_version: '0.3.0', active_days: 20,
            sale_forms_opened: 60, sales_recorded_in_app: 55, sales_abandoned: 5, median_sale_seconds: 14.2, daily_reports: 18,
            recorded_share: 0.82, data_kb_per_active_day: 140.5,
          },
        ]
      : [],
  data_kb_per_active_install_day: 210.3,
})

describe('Utilisation', () => {
  it('shows the customer app figures, then each shop\'s recorded share in Fidelia Pro', async () => {
    await signInAs('admin', {
      'GET /api/admin/usage?app=user&days=30': () => [200, summary('user')],
      'GET /api/admin/usage?app=retailer&days=30': () => [200, summary('retailer')],
    })
    render(<Usage />)
    expect(await screen.findByText('Chez Tantie Awa')).toBeTruthy()
    expect(screen.getByText('Actives sur 30 jours').nextSibling.textContent).toBe('90')
    expect(screen.getByText('210.3 Ko')).toBeTruthy()

    await userEvent.selectOptions(screen.getAllByRole('combobox')[0], 'retailer')
    expect(await screen.findByText('82 %')).toBeTruthy()
    expect(screen.getByText('55 / 60')).toBeTruthy()
  })
})
