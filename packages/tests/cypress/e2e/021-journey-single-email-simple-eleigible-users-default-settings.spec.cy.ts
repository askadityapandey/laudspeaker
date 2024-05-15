import credentials from "../fixtures/credentials";
import { createCustomerViaUI } from "../test-helpers/createCustomerViaUI";
import { createPrimaryKey } from "../test-helpers/createPrimaryKey";
import { loginFunc } from "../test-helpers/loginFunc";
import { setMailgun } from "../test-helpers/setMailgun";
import { setupOrganization } from "../test-helpers/setupOrganization";
import signup from "../test-helpers/signup";


const { email, password, firstName, lastName, organizationName, timeZone, mailgunConfig } = credentials;

describe("company-setup", () => {
  beforeEach(() => {
    cy.request(`${Cypress.env("TESTS_API_BASE_URL")}/tests/reset-tests`);
    cy.wait(1000);
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();
    signup(email, password, firstName, lastName);
    cy.wait(1000);
    setupOrganization(organizationName, timeZone);
    cy.wait(10000);
    setMailgun(mailgunConfig.key, mailgunConfig.name, mailgunConfig.email, mailgunConfig.domain)
    cy.wait(1000);
    createPrimaryKey('email', 'Email');
    cy.wait(1000)
    createCustomerViaUI('mahamad@laudspeaker.com')
    cy.wait(1000)
    createCustomerViaUI('mahamad@trytachyon.com')
  });

  it("passes", () => {
    cy.wait(10000);
    cy.visit("/home");
    cy.url().should("include", "/home");
  });
});