import eslintConfigNext from "eslint-config-next";

const eslintConfig = [
  ...eslintConfigNext,
  {
    ignores: ["node_modules/", ".next/", "out/", "public/", ".github/", ".firebase/"],
  },
];

export default eslintConfig;
