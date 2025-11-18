import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {jwtDecode} from "jwt-decode";

export default function AuthRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jwt = params.get("jwt");

    if (jwt) {
      try {
        const decoded = jwtDecode(jwt);

        // Save claims
        localStorage.setItem("CignaID", decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"]);
        localStorage.setItem("FirstName", decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"]);
        localStorage.setItem("Surname", decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"]);
        localStorage.setItem("Role", decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"]);
        localStorage.setItem("token", jwt);

        // Redirect based on role/landing page claim
        const landingUrl = decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/uri"];
        if (landingUrl) {
          navigate("/" + landingUrl.replace(/^\/+/, ""));
        } else {
          navigate("/dashboard"); // fallback
        }
      } catch (err) {
        console.error("Invalid JWT", err);
        // fallback to backend SAML login
        window.location.href = "https://uat-cg-lpi-portal.sagilityhealth.com:8081/api/login/samlLogin";
      }
    } else {
      // No JWT → redirect to backend SAML login
      window.location.href = "https://uat-cg-lpi-portal.sagilityhealth.com:8081/api/login/samlLogin";
    }
  }, [navigate]);

  return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
      Authenticating... Please wait...
    </div>
  );
}
