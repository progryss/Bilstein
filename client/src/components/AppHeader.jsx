import React from "react";
import Box from "@mui/material/Box";
import CustomizedMenus from "./Select.components";
import logo from "../images/logo.png";
function AppHeader({ validUser }) {
  const headerWrapperCss = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid silver",
    padding: "10px",
  };
  return (
    <>
      <Box className="header" sx={headerWrapperCss}>
        <div>
          {/* <img src={logo} alt="" width="130" /> */}
          <h2>BILSTEIN</h2>
        </div>
        <CustomizedMenus user={validUser} />
      </Box>
    </>
  );
}

export default AppHeader;
