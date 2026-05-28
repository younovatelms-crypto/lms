// src/components/trainer/TrainerLayout.jsx
import React from 'react';
import SidebarLayout from '../shared/SidebarLayout';

const NAV = [
  {
    label: 'Overview',
    items: [
      { to: '/trainer/dashboard',   icon: 'layout-dashboard', label: 'Dashboard'   },
    ],
  },
  {
    label: 'Teaching',
    items: [
      { to: '/trainer/sessions',    icon: 'video',            label: 'Sessions'    },
      { to: '/trainer/attendance',  icon: 'clipboard-check',  label: 'Attendance'  },
      { to: '/trainer/assignments', icon: 'file-pencil',      label: 'Assignments' },
      { to: '/trainer/batches',     icon: 'stack-2',          label: 'My Batches'  },
    ],
  },
  {
    label: 'Content',
    items: [
      { to: '/trainer/resources',   icon: 'books',            label: 'Resources'   },
      { to: '/trainer/projects',    icon: 'git-branch',       label: 'Projects'    },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/trainer/settings',    icon: 'settings',         label: 'Settings'    },
    ],
  },
];

export default function TrainerLayout() {
  return <SidebarLayout navItems={NAV} title="Youva OS Trainer" />;
}

