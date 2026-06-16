// src/components/hr/HRLayout.jsx
import React from 'react';
import SidebarLayout from '../shared/SidebarLayout';

const NAV = [
  {
    label: 'Overview',
    items: [
      { to: '/hr/dashboard',     icon: 'layout-dashboard', label: 'Dashboard'    },
    ],
  },
  {
    label: 'Placement',
    items: [
      { to: '/hr/pipeline',      icon: 'arrows-right',     label: 'Pipeline'     },
      { to: '/hr/interviews',    icon: 'calendar-event',   label: 'Interviews'   },
      // { to: '/hr/evaluations',   icon: 'clipboard-check',  label: 'Evaluations'  },
    ],
  },
  // {
  //   label: 'Reports',
  //   items: [
  //     { to: '/hr/reports',       icon: 'file-analytics',   label: 'Reports'      },
  //     { to: '/hr/analytics',     icon: 'chart-bar',        label: 'Analytics'    },
  //   ],
  // },
  {
    label: 'System',
    items: [
      { to: '/hr/settings',      icon: 'settings',         label: 'Settings'     },
    ],
  },
];

export default function HRLayout() {
  return <SidebarLayout navItems={NAV} title="Youva OS HR" />;
}

