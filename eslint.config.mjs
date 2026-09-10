import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [...nextCoreWebVitals, { ignores: ["design/**", ".next/**"] }];

export default config;
