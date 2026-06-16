// src/components/admin/AdminLayout.jsx
// ✅ Correct import path: ../shared/SidebarLayout
//    (from components/admin/ → up one → shared/)
//
// Nav supports two shapes:
//   Flat item:   { to, icon, label, badge? }
//   Sub-menu:    { icon, label, children: [{ to, icon, label, badge? }] }

import React from 'react';
import SidebarLayout from '../shared/SidebarLayout';

const NAV = [

  {
    label: 'Overview',
    items: [
      { to: '/admin/dashboard', icon: 'layout-dashboard', label: 'Dashboard' },
      // { to: '/admin/analytics', icon: 'chart-bar',        label: 'Analytics' },
    ],
  },
  {
    label: 'Management',
    items: [
      // Flat items
      // { to: '/admin/programs',  icon: 'book',       label: 'Programs' },
      { to: '/admin/batches',   icon: 'stack-2',    label: 'Batches'  },
      { to: '/admin/courses',   icon: 'stack-2',    label: 'courses'  },
      // Sub-menu: Users
      {
        icon: 'users',
        label: 'Users',
        children: [
          { to: '/admin/users',         icon: 'user',          label: 'All Users'     },
          { to: '/admin/trainees',      icon: 'school',        label: 'Trainees'      },
          { to: '/admin/trainers',      icon: 'chalkboard',    label: 'Trainers'      },
        ],
      },
       { to: '/admin/sessions',      icon: 'video',         label: 'Sessions'      }, 

      // Sub-menu: Sessions & Content
      // {
      //   icon: 'device-laptop',
      //   label: 'Sessions & LMS',
      //   children: [
      //     { to: '/admin/sessions',      icon: 'video',         label: 'Sessions'      },
      //     // { to: '/admin/lms',           icon: 'books',         label: 'LMS Content'   },
      //     // { to: '/admin/assignments',   icon: 'file-text',     label: 'Assignments'   },
      //   ],
      // },

      { to: '/admin/registrations', icon: 'clipboard-list', label: 'Registrations' },
    ],
  },
  {
    label: 'Placement',
    items: [
      // Sub-menu: Pipeline
      {
        icon: 'git-merge',
        label: 'Placement',
        children: [
          { to: '/admin/pipeline',    icon: 'arrows-right',   label: 'Pipeline'    },
          { to: '/admin/interviews',  icon: 'calendar-event', label: 'Interviews'  },
          // { to: '/admin/evaluations', icon: 'star',           label: 'Evaluations' },
        ],
      },
    ],
  },
  // {
  //   label: 'YBLP',
  //   items: [
  //     { to: '/admin/residency', icon: 'building', label: 'Residency' },
  //   ],
  // },
  {
    label: 'System',
    items: [
      // { to: '/admin/reports',   icon: 'file-analytics', label: 'Reports'  },
      // { to: '/admin/support',   icon: 'headset',        label: 'Support'  },
      { to: '/admin/settings',  icon: 'settings',       label: 'Settings' },
    ],
  },
];

export default function AdminLayout() {
  return <SidebarLayout navItems={NAV} title="Youva OS Admin" />;
}

