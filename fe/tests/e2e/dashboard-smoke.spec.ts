import { expect, type Page, test } from '@playwright/test';

const qaUser = {
  id: 'user-qa',
  email: 'qa@example.com',
  full_name: 'QA User',
  avatar_url: '',
  created_at: '2026-05-16T00:00:00Z',
  updated_at: '2026-05-16T00:00:00Z',
  projects: [
    {
      id: 'project-qa',
      title: 'QA Project',
      description: 'Project for frontend smoke testing',
    },
  ],
};

async function mockAuthenticatedDashboard(page: Page) {
  await page.route('**/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ authenticated: true, user: qaUser }),
    });
  });

  await page.route('**/api/v1/materials/project/project-qa', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        materials: [
          {
            id: 'material-qa',
            project_id: 'project-qa',
            user_id: 'user-qa',
            file_name: 'qa-notes.pdf',
            file_type: 'pdf',
            file_size: 2048,
            storage_path: 'uploads/qa-notes.pdf',
            status: 'completed',
            summary: 'QA smoke material summary.',
            citations: null,
            created_at: '2026-05-16T00:00:00Z',
            updated_at: '2026-05-16T00:00:00Z',
          },
        ],
      }),
    });
  });
}

test('redirects unauthenticated dashboard users to login', async ({ page }) => {
  await page.route('**/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ authenticated: false }),
    });
  });

  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Continue with Google' })).toBeVisible();
});

test('renders authenticated dashboard shell and materials', async ({ page }) => {
  await mockAuthenticatedDashboard(page);

  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/dashboard\/?$/);
  await expect(page.getByText('LuminaPrep').first()).toBeVisible();
  await expect(page.getByRole('link', { name: /My Materials/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /My Quizzes/i })).toBeVisible();
  await expect(page.getByText(/Welcome back, QA/i)).toBeVisible();
  await expect(page.getByText('qa-notes.pdf')).toBeVisible();
  await expect(page.getByText('Quiz Architect')).toBeVisible();
});
