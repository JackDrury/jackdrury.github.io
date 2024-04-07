let
  nixpkgs = fetchTarball "https://github.com/NixOS/nixpkgs/tarball/nixos-23.11";
  pkgs = import nixpkgs { config = {}; overlays = []; };
in

pkgs.mkShellNoCC {
  packages = with pkgs; [
    nodejs_20
    sqlite
  ];

  IMPORTS = "nodejs_20, sqlite";

shellHook = ''
    npm ci --save-dev webpack webpack-cli typescript ts-loader http-server openai
    npm ci --save sql.js-httpvfs
    echo "Hello! nix shell running with $IMPORTS"
    echo "Shell has npm installed webpack webpack-cli typescript ts-loader and http-server"
  '';
}