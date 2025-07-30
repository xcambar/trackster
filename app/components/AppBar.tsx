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
        <Box sx={{ width: 360 }}>
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
        </Box>
        {showLogout && (
          <>
            <Link
              href="/map"
              color="inherit"
              underline="none"
              sx={{
                px: 2,
                fontWeight: 500,
                "&:hover": {
                  my: 2,
                  textDecoration: "underline",
                },
              }}
            >
              My Maps
            </Link>
            <Link
              href="/activities"
              color="inherit"
              underline="none"
              sx={{
                px: 2,
                fontWeight: 500,
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              My activities
            </Link>
          </>
        )}
        {/* This box acts as a spacer, it pushes the following elements on the right */}
        <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" } }}></Box>

        {showLogout && (
          <IconButton color="inherit" href="/logout">
            <LogoutIcon />
          </IconButton>
        )}
      </Toolbar>
    </MuiAppBar>
  );
}
