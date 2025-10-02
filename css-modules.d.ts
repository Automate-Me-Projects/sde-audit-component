// css-modules.d.ts
declare module '*.module.scss' {
const classes: { [key: string]: string }
  export default classes
}
declare module '*.module.css' {
const classes: { [key: string]: string }
  export default classes
}

declare module '*.css' {
}

declare module '*.JPG' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.png' {
  const value: string;
  export default value;
}