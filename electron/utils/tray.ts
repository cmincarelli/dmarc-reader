/**
 * System Tray / Menubar Icon
 *
 * Creates a menubar icon with quick stats from recent DMARC reports
 */

import { Tray, Menu, BrowserWindow, nativeImage, app } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getDatabase, reports, records } from './database.js';
import { eq, desc } from 'drizzle-orm';

// ESM requires manual __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Detect if running in development or production
const isDevelopment = !app.isPackaged;

let tray: Tray | null = null;

/**
 * Create the tray icon
 */
export function createTray(mainWindow: BrowserWindow): Tray {
  // For macOS menubar, use PNG and set as template image
  // Template images automatically adapt to light/dark mode

  // Get the correct path for both development and production
  let iconPath: string;
  if (isDevelopment) {
    // Development: electron/utils -> ../../../build/icons
    iconPath = path.join(__dirname, '../../../build/icons/tray-icon.png');
  } else {
    // Production: use app.getAppPath() to get the asar root
    iconPath = path.join(app.getAppPath(), 'build/icons/tray-icon.png');
  }

  console.log('[TRAY] Loading icon from:', iconPath);
  const icon = nativeImage.createFromPath(iconPath);
  console.log('[TRAY] Icon loaded, isEmpty:', icon.isEmpty());

  // For macOS, set as template image (recommended for menubar icons)
  if (process.platform === 'darwin' && !icon.isEmpty()) {
    icon.setTemplateImage(true);
  }

  tray = new Tray(icon);
  tray.setToolTip('DMARC Reader');

  // Click to show/hide window
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });

  // Initial menu
  updateTrayMenu(mainWindow);

  // Update menu every 5 minutes
  setInterval(() => updateTrayMenu(mainWindow), 5 * 60 * 1000);

  return tray;
}

/**
 * Update the tray menu with current stats
 */
export async function updateTrayMenu(mainWindow: BrowserWindow): Promise<void> {
  if (!tray) return;

  try {
    const stats = await getRecentReportStats();
    const contextMenu = buildTrayMenu(mainWindow, stats);
    tray.setContextMenu(contextMenu);
  } catch (error) {
    console.error('[TRAY] Failed to update menu:', error);
    // Show error menu
    tray.setContextMenu(buildErrorMenu(mainWindow));
  }
}

/**
 * Get stats from recent reports
 */
async function getRecentReportStats(): Promise<{
  totalReports: number;
  recentReports: Array<{
    domain: string;
    orgName: string;
    dateEnd: Date;
    passRate: number;
    totalEmails: number;
    healthScore: number;
  }>;
}> {
  const db = getDatabase();

  // Get total count
  const allReports = db.select().from(reports).all();
  const totalReports = allReports.length;

  // Get 5 most recent reports
  const recentReportsData = db
    .select()
    .from(reports)
    .where(eq(reports.type, 'rua'))
    .orderBy(desc(reports.dateEnd))
    .limit(5)
    .all();

  const recentReports = [];

  for (const report of recentReportsData) {
    // Get records for this report
    const reportRecords = db
      .select()
      .from(records)
      .where(eq(records.reportId, report.id))
      .all();

    const totalEmails = reportRecords.reduce((sum, r) => sum + r.count, 0);
    const passedEmails = reportRecords
      .filter((r) => r.spfResult === 'pass' && r.dkimResult === 'pass')
      .reduce((sum, r) => sum + r.count, 0);

    const passRate = totalEmails > 0 ? (passedEmails / totalEmails) * 100 : 0;

    // Calculate health score
    let healthScore: number;
    if (passRate >= 95) {
      healthScore = 90 + (passRate - 95);
    } else if (passRate >= 80) {
      healthScore = 70 + ((passRate - 80) / 15) * 20;
    } else {
      healthScore = (passRate / 80) * 70;
    }
    healthScore = Math.round(healthScore);

    recentReports.push({
      domain: report.domain,
      orgName: report.orgName,
      dateEnd: new Date(report.dateEnd * 1000),
      passRate,
      totalEmails,
      healthScore,
    });
  }

  return {
    totalReports,
    recentReports,
  };
}

/**
 * Build the tray menu with stats
 */
function buildTrayMenu(
  mainWindow: BrowserWindow,
  stats: Awaited<ReturnType<typeof getRecentReportStats>>
): Menu {
  const menuItems: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'DMARC Reader',
      enabled: false,
    },
    { type: 'separator' },
  ];

  // Show total reports
  menuItems.push({
    label: `📊 ${stats.totalReports} Total Reports`,
    enabled: false,
  });

  if (stats.recentReports.length > 0) {
    menuItems.push({ type: 'separator' });
    menuItems.push({
      label: 'Recent Reports:',
      enabled: false,
    });

    // Add each recent report
    stats.recentReports.forEach((report) => {
      const statusEmoji = report.passRate >= 95 ? '✅' : report.passRate >= 80 ? '⚠️' : '❌';
      const healthEmoji = report.healthScore >= 90 ? '💚' : report.healthScore >= 70 ? '💛' : '❤️';

      menuItems.push({
        label: `  ${statusEmoji} ${report.domain}`,
        submenu: [
          {
            label: `Organization: ${report.orgName}`,
            enabled: false,
          },
          {
            label: `Report Date: ${report.dateEnd.toLocaleDateString()}`,
            enabled: false,
          },
          { type: 'separator' },
          {
            label: `${healthEmoji} Health Score: ${report.healthScore}`,
            enabled: false,
          },
          {
            label: `Pass Rate: ${report.passRate.toFixed(1)}%`,
            enabled: false,
          },
          {
            label: `Total Emails: ${report.totalEmails.toLocaleString()}`,
            enabled: false,
          },
          { type: 'separator' },
          {
            label: 'View in App',
            click: () => {
              mainWindow.show();
              mainWindow.webContents.send('navigate-to', 'reports');
            },
          },
        ],
      });
    });
  } else {
    menuItems.push({ type: 'separator' });
    menuItems.push({
      label: 'No reports imported yet',
      enabled: false,
    });
  }

  menuItems.push({ type: 'separator' });
  menuItems.push({
    label: 'Show DMARC Reader',
    click: () => {
      mainWindow.show();
    },
  });
  menuItems.push({
    label: 'Refresh Stats',
    click: () => {
      updateTrayMenu(mainWindow);
    },
  });
  menuItems.push({ type: 'separator' });
  menuItems.push({
    label: 'Quit',
    click: () => {
      app.quit();
    },
  });

  return Menu.buildFromTemplate(menuItems);
}

/**
 * Build error menu when stats fail to load
 */
function buildErrorMenu(mainWindow: BrowserWindow): Menu {
  return Menu.buildFromTemplate([
    {
      label: 'DMARC Reader',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: '⚠️ Error loading stats',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Show DMARC Reader',
      click: () => {
        mainWindow.show();
      },
    },
    {
      label: 'Retry',
      click: () => {
        updateTrayMenu(mainWindow);
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);
}

/**
 * Destroy the tray icon
 */
export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
