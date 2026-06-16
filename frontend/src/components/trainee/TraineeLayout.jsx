// src/components/trainee/TraineeLayout.jsx
import React from 'react';
import SidebarLayout from '../shared/SidebarLayout';

const NAV = [
  {
    label: 'My Learning',
    items: [
      { to: '/trainee/dashboard',   icon: 'layout-dashboard', label: 'Dashboard'   },
      { to: '/trainee/courses',     icon: 'book',             label: 'My Courses'  },
      { to: '/trainee/sessions',    icon: 'video',            label: 'Sessions'    },
      // { to: '/trainee/assignments', icon: 'file-pencil',      label: 'Assignments' },
    ],
  },
  {
    label: 'Progress',
    items: [
      { to: '/trainee/progress',    icon: 'chart-line',       label: 'My Progress' },
      // { to: '/trainee/internship',  icon: 'briefcase',        label: 'Internship'  },
    ],
  },
  // {
  //   label: 'Placement',
  //   items: [
  //     { to: '/trainee/placement',   icon: 'building',         label: 'Placement'   },
  //     { to: '/trainee/interviews',  icon: 'calendar-event',   label: 'Interviews'  },
  //   ],
  // },
  {
    label: 'System',
    items: [
      { to: '/trainee/settings',    icon: 'settings',         label: 'Settings'    },
    ],
  },
];

export default function TraineeLayout() {
  return <SidebarLayout navItems={NAV} title="Youva OS" />;
}

