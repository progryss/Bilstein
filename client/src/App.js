import AppHeader from './components/AppHeader';
import Login from './components/authentication/Login';
import PasswordChange from './components/authentication/PasswordChangeForm';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import AuthGuard from './components/authentication/userProtected';
import Dashboard from './components/Dashboard';
import Users from './components/users';
import FilterTags from './components/filterTags';
import InventoryStore from './components/inventoryStore';
import SortingTags from './components/sortingTags';

const theme = createTheme({
  typography: {
    fontFamily: [
      'Poppins',
    ].join(','),
  }
});

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <AuthGuard>
        <AppHeader />
        <Dashboard />
      </AuthGuard>
    )
  },
  {
    path: "/change-password",
    element: (
      <AuthGuard>
        <AppHeader />
        <PasswordChange />
      </AuthGuard>
    )
  },
  {
    path: "/login",
    element: (
      <Login />
    )
  },
  {
    path: "/user-register",
    element: (
      <AuthGuard>
        <AppHeader />
        <Users />
      </AuthGuard>
    )
  },
  {
    path: "/filter-tags",
    element: (
      <AuthGuard>
        <AppHeader />
        <FilterTags />
      </AuthGuard>
    )
  },
  {
    path: "/sorting-tags",
    element: (
      <AuthGuard>
        <AppHeader />
        <SortingTags />
      </AuthGuard>
    )
  },
  {
    path: "/inventory-store",
    element: (
      <AuthGuard>
        <AppHeader />
        <InventoryStore />
      </AuthGuard>
    )
  }
])

function App() {

  return (
    <ThemeProvider theme={theme}>
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}

export default App;
