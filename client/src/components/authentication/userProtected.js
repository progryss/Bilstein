import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const serverUrl = process.env.REACT_APP_SERVER_URL;

const AuthGuard = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [validUser, setValidUser] = useState(null);


    // Function to validate user session
    const userValidation = useCallback(async () => {
        try {
            const response = await axios.get(`${serverUrl}/api/validate-user`, {
                withCredentials: true,
                headers: {
                    "Content-Type": "application/json",
                }
            });

            console.log('Validation response:', response);
            setValidUser(response.data);

        } catch (error) {

            if (error.response && error.response.status === 401) {
                console.log('User not verified. Redirecting to login.');
                navigate("/login");
            } else {
                console.error('Error validating user:', error);
            }
        }
    }, [navigate, serverUrl]);

    useEffect(() => {
        userValidation();
    }, [location.pathname, userValidation, navigate]);

    if (validUser === null) {
        return <div>Loading...</div>;
    }

    return (
        <>
            {React.Children.map(children, child => {
                return React.cloneElement(child, { validUser });
            })}
        </>
    );
};

export default AuthGuard;
