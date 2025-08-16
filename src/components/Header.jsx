import React, { useState } from 'react';
import styled from 'styled-components';
import { AppBar, Toolbar, Button, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MenuIcon from '@mui/icons-material/Menu';
import { Link } from 'react-router-dom';

const HeaderContainer = styled(AppBar)`
  background-color: #1a1a1a;
  position: static;
`;

const Logo = styled(Link)`
  color: white;
  text-decoration: none;
  font-size: 1.5rem;
  font-weight: bold;
  display: flex;
  align-items: center;
`;

const LogoImage = styled.img`
  height: 30px;
  margin-right: 10px;
`;

const NavMenu = styled.nav`
  margin: 0 auto;
  display: flex;
  gap: 20px;
`;

const NavLink = styled(Link)`
  color: white;
  text-decoration: none;
  &:hover {
    color: #1db954;
  }
`;

const SearchContainer = styled.div`
  margin-left: auto;
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchInput = styled.input`
  background-color: #282828;
  border: none;
  border-radius: 20px;
  padding: 8px 36px 8px 16px;
  color: white;
  &::placeholder {
    color: #aaa;
  }
`;

const SearchIconWrapper = styled(IconButton)`
  position: absolute;
  right: 4px;
  color: #aaa;
`;

const Header = ({ onToggleSidebar }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <HeaderContainer>
      <Toolbar>
        <IconButton 
          color="inherit" 
          edge="start" 
          onClick={onToggleSidebar}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        <Logo to="/">
          <LogoImage src="/qmusic.png" alt="Q-Music" />
          qmusic
        </Logo>
        <NavMenu>
          <NavLink to="/">Home</NavLink>
          <NavLink to="/all-songs">All Songs</NavLink>
          <NavLink to="/playlists">All Playlists</NavLink>
          {isAuthenticated && (
            <>
              <NavLink to="/add-music">Add New Music</NavLink>
              <NavLink to="/create-playlist">Create Playlist</NavLink>
            </>
          )}
        </NavMenu>
        <SearchContainer>
          <SearchInput placeholder="Search songs..." />
          <SearchIconWrapper size="small">
            <SearchIcon fontSize="small" />
          </SearchIconWrapper>
        </SearchContainer>
        <Button color="inherit" onClick={() => setIsAuthenticated(!isAuthenticated)}>
          {isAuthenticated ? 'Logout' : 'Login'}
        </Button>
      </Toolbar>
    </HeaderContainer>
  );
};

export default Header;
