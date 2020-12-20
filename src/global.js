import { createGlobalStyle } from 'styled-components';


export const GlobalStyles = createGlobalStyle`
  *,
  *::after,
  *::before {
    box-sizing: border-box;
  }

  body {
    display: flex;
    flex-direction: column;
    background: ${({ theme }) => theme.body};
    color: ${({ theme }) => theme.text};
    padding: 0;
    margin: 0;
    font-family: 'Salsa', cursive;
    transition: all 0.25s linear;
  }
  a {
    color: ${({ theme }) => theme.text};
  }
`;