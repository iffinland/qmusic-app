import React, { useState } from 'react';
import styled from 'styled-components';
import { AppBar, Toolbar, Button, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
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

const Header = ({ isAuthenticated, onLogin, onLogout }) => {
  return (
    <HeaderContainer>
      <Toolbar>
        <Logo to="/">
          qmusic
        </Logo>
        <NavMenu>
          <NavLink to="/browse">Browse Songs</NavLink>
          <NavLink to="/playlists">All Playlists</NavLink>
          {isAuthenticated && (
            <>
              <NavLink to="/add-music">Add New Music</NavLink>
              <NavLink to="/create-playlist">Create Playlist</NavLink>
            </>
          )}
        </NavMenu>
        <IconButton color="inherit">
          <SearchIcon />
        </IconButton>
        {isAuthenticated ? (
          <Button color="inherit" onClick={onLogout}>
            Logout
          </Button>
        ) : (
          <Button color="inherit" onClick={onLogin}>
            Login
          </Button>
        )}
      </Toolbar>
    </HeaderContainer>
  );
};

export default Header;
