import React from 'react'
import ReactDOM from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import { DashboardView } from '@/views/DashboardView'
import { SettingsView } from '@/views/SettingsView'
import { BenchmarkView } from '@/views/BenchmarkView'
import './index.css'

const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <DashboardView /> },
      { path: 'settings', element: <SettingsView /> },
      { path: 'benchmark', element: <BenchmarkView /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
