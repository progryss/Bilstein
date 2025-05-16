import { Box, Button } from '@mui/material';
import React, { useState } from 'react'
import CloseIcon from '@mui/icons-material/Close';
import TextField from '@mui/material/TextField';
import axios from 'axios';
import { useProgressToast } from "./customHooks/useProgressToast";
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { IconButton, InputAdornment } from '@mui/material';

const serverUrl = process.env.REACT_APP_SERVER_URL;

const UserDetails = React.forwardRef(({ user, close, refresh }, ref) => {

    const { showProgressToast, updateProgress, finalizeToast, setProgress } = useProgressToast();

    const [name, setName] = React.useState(user.name);
    const [email, setEmail] = React.useState(user.email);

    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState(false);
    const [passwordErrorMessage, setPasswordErrorMessage] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState(false);
    const [confirmPasswordErrorMessage, setConfirmPasswordErrorMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showconfirmPassword, setShowconfirmPassword] = useState(false);

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
    const updateUser = async (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        const payload = Object.fromEntries(formData.entries())
        payload._id = user._id

        if (validateInputs()) {
            const toastId = showProgressToast('Updating User');
            updateProgress(toastId, 'loader', 'Updating User');
            try {
                const response = await axios.put(`${serverUrl}/api/update-user`, payload, {
                    headers: {
                        "Content-Type": "application/json"
                    },
                    withCredentials: true
                })
                if (response.status === 200) {
                    close();
                    refresh();
                    finalizeToast(toastId, true, "User Updated Successfully!");
                }
            } catch (error) {
                finalizeToast(toastId, false, "Failed to update user.");
                console.error('Error Updating User:', error);
            }
        }

    }

    const handleTogglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const handleToggleConfirmPasswordVisibility = () => {
        setShowconfirmPassword(!showconfirmPassword);
    };

    const validateInputs = () => {
        const password = document.querySelector('[name="newPassword"]');
        const confirmPassword = document.querySelector('[name="confirmNewPassword"]');

        let isValid = true;

        if (password.value.length < 6 && password.value.length > 0) {
            setPasswordError(true);
            setPasswordErrorMessage('Password must be at least 6 characters long.');
            isValid = false;
        } else {
            setPasswordError(false);
            setPasswordErrorMessage('');
        }

        if (confirmPassword?.value?.length < 6 && confirmPassword?.value?.length > 0) {
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
            <Box component="form" autoComplete="off" onSubmit={updateUser}>
                <CloseIcon onClick={close} sx={{ position: 'absolute', right: 16, top: 16, cursor: 'pointer' }} />
                <TextField autoFocus label="Name" name="name" variant="outlined" margin="normal" fullWidth value={name} onChange={e => setName(e.target.value)} />
                <TextField label="Email" name="email" type="email" variant="outlined" margin="normal" fullWidth value={email} onChange={e => setEmail(e.target.value)} />
                <TextField
                    error={passwordError}
                    helperText={passwordErrorMessage}
                    name="newPassword"
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
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
                    name="confirmNewPassword"
                    label="Confirm New Password"
                    margin="normal"
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
                    Update User
                </Button>
            </Box>
        </Box>
    )
})

export default UserDetails;
