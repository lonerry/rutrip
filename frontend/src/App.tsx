import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth'
import { Layout } from './components/Layout'
import { Protected } from './components/Protected'
import { AuthPage } from './pages/AuthPage'
import { FriendPage } from './pages/FriendPage'
import { Landing } from './pages/Landing'
import { MapPage } from './pages/MapPage'
import { PeoplePage } from './pages/PeoplePage'
import { ProfilePage } from './pages/ProfilePage'
import { StoriesPage } from './pages/StoriesPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
            <Route
              path="/map"
              element={
                <Protected>
                  <MapPage />
                </Protected>
              }
            />
            <Route
              path="/map/:userId"
              element={
                <Protected>
                  <MapPage />
                </Protected>
              }
            />
            <Route
              path="/stories"
              element={
                <Protected>
                  <StoriesPage />
                </Protected>
              }
            />
            <Route
              path="/people"
              element={
                <Protected>
                  <PeoplePage />
                </Protected>
              }
            />
            <Route
              path="/people/:userId"
              element={
                <Protected>
                  <FriendPage />
                </Protected>
              }
            />
            <Route
              path="/profile"
              element={
                <Protected>
                  <ProfilePage />
                </Protected>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
