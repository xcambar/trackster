import {
  AppBar as MuiAppBar,
  Box,
  IconButton,
  Link,
  Toolbar,
  Typography,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import PlaceIcon from "@mui/icons-material/Place";

interface AppBarProps {
  showLogout?: boolean;
}

export function AppBar({ showLogout = false }: AppBarProps) {
  return (
    <MuiAppBar sx={{ flexGrow: 0 }} position="static">
      <Toolbar>
        <Link
          href="/"
          sx={{ display: "flex", alignItems: "center" }}
          color="inherit"
          underline="none"
        >
          <PlaceIcon sx={{ display: { xs: "none", md: "flex" }, mr: 1 }} />
          <Typography
            variant="h6"
            noWrap
            sx={{
              mr: 2,
              display: { xs: "none", md: "flex" },
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: ".2rem",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            Trackster
          </Typography>
        </Link>

        {/* This box acts as a spacer, it pushes the following elements on the right */}
        <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" } }}></Box>
        
        <Box sx={{ flexGrow: 0 }}>
          {showLogout && (
            <IconButton color="inherit" href="/logout">
              <LogoutIcon />
            </IconButton>
          )}
        </Box>
      </Toolbar>
    </MuiAppBar>
  );
}