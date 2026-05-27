// src/components/admin/AdminLayout.jsx
// ✅ Correct import path: ../shared/SidebarLayout
//    (from components/admin/ → up one → shared/)

import React from 'react';
import SidebarLayout from '../shared/SidebarLayout';

const NAV = [
  {
    label: 'Overview',
    items: [
      { to: '/admin/dashboard',     icon: 'layout-dashboard', label: 'Dashboard'     },
      { to: '/admin/analytics',     icon: 'chart-bar',        label: 'Analytics'     },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/admin/users',         icon: 'users',            label: 'Users'         },
      { to: '/admin/trainees',      icon: 'school',           label: 'Trainees'      },
      { to: '/admin/trainers',      icon: 'chalkboard',       label: 'Trainers'      },
      { to: '/admin/batches',       icon: 'stack-2',          label: 'Batches'       },
      { to: '/admin/programs',      icon: 'book',             label: 'Programs'      },
      { to: '/admin/sessions',      icon: 'video',            label: 'Sessions'      },
      { to: '/admin/registrations', icon: 'clipboard-list',   label: 'Registrations' },
    ],
  },
  {
    label: 'Placement',
    items: [
      { to: '/admin/pipeline',      icon: 'arrows-right',     label: 'Pipeline'      },
      { to: '/admin/interviews',    icon: 'calendar-event',   label: 'Interviews'    },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/reports',       icon: 'file-analytics',   label: 'Reports'       },
      { to: '/admin/support',       icon: 'headset',          label: 'Support'       },
      { to: '/admin/settings',      icon: 'settings',         label: 'Settings'      },
    ],
  },
];

export default function AdminLayout() {
  return <SidebarLayout navItems={NAV} title="Younovate Admin" />;
}