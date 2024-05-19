import credentials from "../fixtures/credentials";
import {sendPassword} from "../test-helpers/sendPassword";
import signup from "../test-helpers/signup";

const { email, password, firstName, lastName } = credentials;

describe("signup", () => {
  beforeEach(() => {
    cy.request(`${Cypress.env("TESTS_API_BASE_URL")}/tests/reset-tests`);
    cy.wait(1000);
    cy.clearAllCookies()
    cy.clearAllLocalStorage()
    cy.clearAllSessionStorage()
    signup(email, password, firstName, lastName);
    cy.wait(1000);
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();
  });

  it("passes", () => {
    sendPassword(email);
    cy.wait(1000);
    cy.url().should("include", "/login");
  });
});
