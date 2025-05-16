import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import MuiCard from '@mui/material/Card';
import { styled } from '@mui/material/styles';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { IconButton, InputAdornment } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import logo from '../../images/logo.png';
import { useProgressToast } from '../customHooks/useProgressToast';

const serverUrl = process.env.REACT_APP_SERVER_URL;

const Card = styled(MuiCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'center',
  width: '100%',
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  margin: 'auto',
  [theme.breakpoints.up('sm')]: {
    maxWidth: '450px',
  },
  boxShadow:
    'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
  ...theme.applyStyles('dark', {
    boxShadow:
      'hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px',
  }),
}));

const SignInContainer = styled(Stack)(({ theme }) => ({
  minHeight: '100%',
  padding: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(4),
  },
  '&::before': {
    content: '""',
    display: 'block',
    position: 'absolute',
    zIndex: -1,
    inset: 0,
    backgroundImage:
      'radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))',
    backgroundRepeat: 'no-repeat',
    ...theme.applyStyles('dark', {
      backgroundImage:
        'radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))',
    }),
  },
}));

export default function Login(props) {
  const { showProgressToast, updateProgress, finalizeToast, setProgress } = useProgressToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loginErr, setLoginErr] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();;

    const formData = {
      email: email,
      password: password,
    };

    if (validateInputs()) {
      const toastId = showProgressToast('User login...');
      updateProgress(toastId, 'loader', 'User login');
      try {
        const response = await axios.post(`${serverUrl}/api/user-login`, formData, {
          headers: {
            "Content-Type": "application/json"
          },
          withCredentials: true
        }
        )
        resetForm();
        if (response.status === 200) {
          setTimeout(() => {
            navigate("/");
            finalizeToast(toastId, true, "User Logged In Successfully.");
          }, 700)
        }
      } catch (error) {
        console.log(error, "Login API Error");
        setLoginErr("Invalid credentials email and password");
        finalizeToast(toastId, false, "Error in user logged in!");
      }

    }
  };

  const validateInputs = () => {
    const email = document.getElementById('email');
    const password = document.getElementById('password');

    let isValid = true;

    if (!email.value || !/\S+@\S+\.\S+/.test(email.value)) {
      setEmailError(true);
      setEmailErrorMessage('Please enter a valid email address.');
      isValid = false;
    } else {
      setEmailError(false);
      setEmailErrorMessage('');
    }

    if (!password.value || password.value.length < 6) {
      setPasswordError(true);
      setPasswordErrorMessage('Password must be at least 6 characters long.');
      isValid = false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage('');
    }

    return isValid;
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setEmailError(false);
    setEmailErrorMessage('');
    setPasswordError(false);
    setPasswordErrorMessage("");
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <>
      <SignInContainer direction="column" justifyContent="space-between" height="100vh" >
        <Card variant="outlined">
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            {/* <img src={logo} alt='' width='150' /> */}
            <h2>BILSTEIN</h2>
          </Box>
          <Typography
            component="h1"
            variant="h4"
            sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}
          >
            Sign in
          </Typography>
          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              gap: 2,
            }}
          >
            <FormControl>
              <TextField
                error={emailError}
                helperText={emailErrorMessage}
                id="email"
                type="email"
                name="email"
                label="Email"
                autoComplete="email"
                autoFocus
                required
                fullWidth
                variant="outlined"
                onChange={(e) => setEmail(e.target.value)}
                color={emailError ? 'error' : 'primary'}
                sx={{ ariaLabel: 'email' }}
                value={email}

              />
            </FormControl>
            <FormControl>
              <TextField
                error={passwordError}
                helperText={passwordErrorMessage}
                type={showPassword ? 'text' : 'password'}
                name="password"
                label="Password"
                id="password"
                autoComplete="current-password"
                fullWidth
                variant="outlined"
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleTogglePasswordVisibility}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                color={passwordError ? 'error' : 'primary'}
              />
            </FormControl>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ backgroundColor: 'black' }}
            >
              Login
            </Button>
            <Typography variant='body1' color='#d32f2f' textAlign="center" component={'span'}>{loginErr}</Typography>
          </Box>
        </Card>
      </SignInContainer>
    </>
  );
}
