import type { NextPageContext } from "next";

interface ErrorPageProps {
  statusCode?: number;
}

function ErrorPage({ statusCode }: ErrorPageProps) {
  const code = statusCode ?? 500;
  return (
    <main style={{ padding: 24 }}>
      <h1>{code} - Something went wrong</h1>
      <p>An error occurred while rendering this page.</p>
    </main>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext): ErrorPageProps => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 500;
  return { statusCode };
};

export default ErrorPage;
