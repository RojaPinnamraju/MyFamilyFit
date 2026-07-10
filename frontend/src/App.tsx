import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Onboarding } from './pages/Onboarding'
import { JoinFamily } from './pages/JoinFamily'
import { GoogleCallback } from './pages/GoogleCallback'
import { Dashboard } from './pages/Dashboard'
import { Profile } from './pages/Profile'
import { Family } from './pages/Family'
import { WeightTracking } from './pages/WeightTracking'
import { WorkoutTracking } from './pages/WorkoutTracking'
import { MealTracking } from './pages/MealTracking'
import { WaterTracking } from './pages/WaterTracking'
import { NutritionPage } from './pages/NutritionPage'
import { MedicationsPage } from './pages/MedicationsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login"         element={<Login />} />
        <Route path="/register"      element={<Register />} />
        <Route path="/join"          element={<JoinFamily />} />
        <Route path="/auth/callback" element={<GoogleCallback />} />

        {/* Protected — full-screen (no sidebar layout) */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />

        {/* Protected — with sidebar layout */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile"   element={<Profile />} />
          <Route path="/family"    element={<Family />} />
          <Route path="/weight"    element={<WeightTracking />} />
          <Route path="/workouts"  element={<WorkoutTracking />} />
          <Route path="/meals"     element={<MealTracking />} />
          <Route path="/water"       element={<WaterTracking />} />
          <Route path="/nutrition"   element={<NutritionPage />} />
          <Route path="/medications" element={<MedicationsPage />} />
        </Route>

        {/* Redirect root */}
        <Route path="/"  element={<Navigate to="/dashboard" replace />} />
        <Route path="*"  element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
