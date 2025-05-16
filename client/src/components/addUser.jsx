import React, { useState } from 'react';
import axios from 'axios';
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { useProgressToast } from "./customHooks/useProgressToast";
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { IconButton, InputAdornment } from '@mui/material';

const serverUrl = process.env.REACT_APP_SERVER_URL;

const AddUser = React.forwardRef(({ refresh, close }, ref) => {

    const { showProgressToast, updateProgress, finalizeToast, setProgress } = useProgressToast();
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState(false);
    const [passwordErrorMessage, setPasswordErrorMessage] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState(false);
    const [confirmPasswordErrorMessage, setConfirmPasswordErrorMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showconfirmPassword, setShowconfirmPassword] = useState(false);

    const addNewUser = async (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        const payload = Object.fromEntries(formData.entries());
        payload.role = false; // Assuming 'role' is a boolean field in your user schema

        if (validateInputs()) {
            const toastId = showProgressToast('Creating User');
            updateProgress(toastId, 'loader', 'Creating User');
            try {
                const response = await axios.post(`${serverUrl}/api/user-register`, payload, {
                    headers: { "Content-Type": "application/json" }
                });
                if (response.status === 200) {
                    close();
                    refresh();
                    finalizeToast(toastId, true, "User Created Successfully!");
                }
            } catch (error) {
                finalizeToast(toastId, false, "Failed to create user");
                console.error('Error creating user:', error);
            }
        }
    };

    const modelStyle = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
        outline: 'none'  // Avoid outline when focused
    };

    const handleTogglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const handleToggleConfirmPasswordVisibility = () => {
        setShowconfirmPassword(!showconfirmPassword);
    };

    const validateInputs = () => {
        const password = document.querySelector('[name="password"]');
        const confirmPassword = document.querySelector('[name="confirmPassword"]');

        let isValid = true;

        if (!password.value || password.value.length < 6) {
            setPasswordError(true);
            setPasswordErrorMessage('Password must be at least 6 characters long.');
            isValid = false;
        } else {
            setPasswordError(false);
            setPasswordErrorMessage('');
        }

        if (!confirmPassword?.value || confirmPassword?.value?.length < 6) {
            setConfirmPasswordError(true);
            setConfirmPasswordErrorMessage('Confirm Password must be at least 6 characters long.');
            isValid = false;
        } else if (confirmPassword?.value !== password?.value) {
            setConfirmPasswordError(true);
            setConfirmPasswordErrorMessage('Confirm password not matched with the password');
            isValid = false;
        } else {
            setConfirmPasswordError(false);
            setConfirmPasswordErrorMessage('');
        }

        return isValid;
    };

    return (
        <Box ref={ref} sx={modelStyle}>
            <Box component="form" noValidate autoComplete="off" onSubmit={addNewUser}>
                <CloseIcon onClick={close} sx={{ position: 'absolute', right: 16, top: 16, cursor: 'pointer' }} />
                <TextField autoFocus label="Name" name="name" variant="outlined" margin="normal" fullWidth required />
                <TextField label="Email" name="email" type="email" variant="outlined" margin="normal" fullWidth required />
                <TextField
                    error={passwordError}
                    helperText={passwordErrorMessage}
                    name="password"
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    fullWidth
                    variant="outlined"
                    color={passwordError ? 'error' : 'primary'}
                    onChange={(e) => setPassword(e.target.value)}
                    value={password}
                    margin="normal"
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
                />
                <TextField
                    error={confirmPasswordError}
                    helperText={confirmPasswordErrorMessage}
                    type={showconfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    label="Confirm New Password"
                    margin="normal"
                    required
                    fullWidth
                    variant="outlined"
                    color={confirmPasswordError ? 'error' : 'primary'}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    value={confirmPassword}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    aria-label="toggle password visibility"
                                    onClick={handleToggleConfirmPasswordVisibility}
                                    edge="end"
                                >
                                    {showconfirmPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                />
                <Button type="submit" variant="contained" sx={{ mt: 2, mb: 2 }} fullWidth>
                    Add User
                </Button>
            </Box>
        </Box>
    );
});

export default AddUser;
