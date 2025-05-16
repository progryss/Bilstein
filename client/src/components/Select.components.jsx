import * as React from 'react';
import { styled, alpha } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import EditIcon from '@mui/icons-material/Edit';
import Person4Icon from '@mui/icons-material/Person4';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useNavigate } from 'react-router-dom';
import { useProgressToast } from './customHooks/useProgressToast';
import axios from 'axios';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import InventoryIcon from '@mui/icons-material/Inventory';
import SortIcon from '@mui/icons-material/Sort';

const serverUrl = process.env.REACT_APP_SERVER_URL;

const StyledMenu = styled((props) => (
  <Menu
    elevation={0}
    anchorOrigin={{
      vertical: 'bottom',
      horizontal: 'right',
    }}
    transformOrigin={{
      vertical: 'top',
      horizontal: 'right',
    }}
    {...props}
  />
))(({ theme }) => ({
  '& .MuiPaper-root': {
    borderRadius: 6,
    marginTop: theme.spacing(1),
    minWidth: 180,
    color: 'rgb(55, 65, 81)',
    boxShadow:
      'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
    '& .MuiMenu-list': {
      padding: '4px 0',
    },
    '& .MuiMenuItem-root': {
      '& .MuiSvgIcon-root': {
        fontSize: 18,
        color: theme.palette.text.secondary,
        marginRight: theme.spacing(1.5),
      },
      '&:active': {
        backgroundColor: alpha(
          theme.palette.primary.main,
          theme.palette.action.selectedOpacity,
        ),
      },
    },
    ...theme.applyStyles('dark', {
      color: theme.palette.grey[300],
    }),
  },
}));

export default function CustomizedMenus({ user }) {

  const { showProgressToast, updateProgress, finalizeToast, setProgress } = useProgressToast();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const navigate = useNavigate();
  const open = Boolean(anchorEl);
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    const toastId = showProgressToast('Processing');
    updateProgress(toastId, 'loader', 'Processing');
    try {
      await axios.post(`${serverUrl}/api/logout`, {}, { withCredentials: true });
      finalizeToast(toastId, true, "Logged Out Successfully");
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    } catch (error) {
      console.error('Logout Error:', error);
      finalizeToast(toastId, true, "Error in logging out!");
    }
  };

  const changePassword = () => {
    navigate('/change-password')
    setAnchorEl(null);
  };

  const userStore = () => {
    navigate('/user-register')
    setAnchorEl(null);
  };

  const visitProductTagInfo = () => {
    navigate('/filter-tags')
    setAnchorEl(null);
  };

  const visitProductSortingInfo = () => {
    navigate('/sorting-tags')
    setAnchorEl(null);
  };

  const goToDash = () => {
    navigate('/');
    setAnchorEl(null);
  }

  const inventoryStore = () => {
    navigate('/inventory-store')
    setAnchorEl(null);
  }

  return (
    <div>
      <Button
        id="demo-customized-button"
        aria-controls={open ? 'demo-customized-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        variant="contained"
        disableElevation
        onClick={handleClick}
        endIcon={<KeyboardArrowDownIcon />}
      >
        {user.name}
      </Button>
      <StyledMenu
        id="demo-customized-menu"
        MenuListProps={{
          'aria-labelledby': 'demo-customized-button',
        }}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        <MenuItem onClick={goToDash} disableRipple>
          <HomeIcon />
          Dashboard
        </MenuItem>
        <MenuItem onClick={visitProductTagInfo} disableRipple>
          <LocalOfferIcon />
          Filter Tags
        </MenuItem>
        <MenuItem onClick={visitProductSortingInfo} disableRipple>
          <SortIcon />
          Sorting Tags
        </MenuItem>
        <MenuItem onClick={changePassword} disableRipple>
          <EditIcon />
          Change Password
        </MenuItem>
        {user.role && (
          <MenuItem onClick={userStore} disableRipple>
            <Person4Icon />
            Users
          </MenuItem>
        )}
        <MenuItem onClick={inventoryStore} disableRipple>
          <InventoryIcon />
          Inventory
        </MenuItem>
        <MenuItem onClick={handleLogout} disableRipple>
          <LogoutIcon />
          Logout
        </MenuItem>
      </StyledMenu>
    </div>
  );
}
