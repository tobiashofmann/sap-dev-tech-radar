<script setup>
defineEmits(['back'])
</script>

<template>
  <div class="privacy-page">
    <nav class="breadcrumb">
      <a href="#" @click.prevent="$emit('back')">Radar</a> &rsaquo; Privacy Policy
    </nav>

    <ui5-card>
      <ui5-card-header slot="header" title-text="Privacy Policy"></ui5-card-header>
      <div class="card-body">
        <section class="policy-section">
          <h2>1. Data protection at a glance</h2>
          <h3>General information</h3>
          <p>The following information provides a simple overview of what happens to your
            personal data when you visit this website. Personal data is any data that can be
            used to personally identify you.</p>
          <h3>Data collection on this website</h3>
          <p>Data processing on this website is carried out by the website operator. Their
            contact details can be found in the following section.</p>
        </section>

        <section class="policy-section">
          <h2>2. Controller</h2>
          <p>The party responsible for data processing on this website (the "controller") is:</p>
          <p class="address">
            [Name]<br/>
            [Street and house number]<br/>
            [Postal code and city]
          </p>
          <p>Email: [email]</p>
          <p class="muted">
            The controller is the natural or legal person who, alone or jointly with others,
            determines the purposes and means of processing personal data (e.g. names, email
            addresses, etc.).
          </p>
        </section>

        <section class="policy-section">
          <h2>3. Hosting via GitHub Pages</h2>
          <p>We host this website using the GitHub Pages service provided by GitHub, Inc.
            (88 Colin P. Kelly Jr. St., San Francisco, CA 94107, USA; hereinafter "GitHub").</p>
          <p>When you access this website, GitHub automatically collects information in
            so-called server log files, which your browser automatically transmits to GitHub.
            This includes:</p>
          <ul>
            <li>IP address of the accessing device</li>
            <li>Date and time of the server request</li>
            <li>Name and URL of the file retrieved</li>
            <li>Amount of data transferred</li>
            <li>Notification of whether the request was successful (HTTP status code)</li>
            <li>Browser and operating system identification data</li>
            <li>Website from which access was made (referrer URL)</li>
          </ul>
          <h3>Purpose and legal basis</h3>
          <p>Collecting this data is technically necessary to reliably deliver the website,
            ensure system security, and defend against attacks (e.g. DDoS attacks). This
            constitutes a legitimate interest within the meaning of Art. 6(1)(f) GDPR.</p>
          <h3>Data transfer</h3>
          <p>Since GitHub is a US company, the log data is processed on servers in the USA.
            The data transfer is safeguarded by the European Commission's Standard Contractual
            Clauses and the EU-US Data Privacy Framework.</p>
          <p>For more information on data protection at GitHub, see the
            <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">GitHub General Privacy Statement &#8599;</a>.</p>
        </section>

        <section class="policy-section">
          <h2>4. Cookies and tracking tools</h2>
          <p>This website is purely static. We do <b>not use cookies</b>, do
            <b>not perform any tracking</b>, and do <b>not use any analytics services</b>
            (such as Google Analytics). We do not store or evaluate any personal data about you.</p>
        </section>

        <section class="policy-section">
          <h2>5. Your rights as a data subject</h2>
          <p>Under the applicable legal provisions (GDPR), you have the right at any time to:</p>
          <ul>
            <li><b>Access (Art. 15 GDPR):</b> request information about the data we process about you.</li>
            <li><b>Rectification (Art. 16 GDPR):</b> request correction of inaccurate data.</li>
            <li><b>Erasure (Art. 17 GDPR):</b> request deletion of your data, provided no retention obligations apply.</li>
            <li><b>Restriction of processing (Art. 18 GDPR):</b> request that processing of your data be restricted.</li>
            <li><b>Object (Art. 21 GDPR):</b> object to data processing carried out on the basis of a legitimate interest.</li>
            <li><b>Lodge a complaint (Art. 77 GDPR):</b> lodge a complaint with a competent data protection supervisory authority.</li>
          </ul>
        </section>
      </div>
    </ui5-card>
  </div>
</template>

<style scoped>
.privacy-page { padding: 1.5rem; max-width: 900px; margin: 0 auto; }
.breadcrumb { margin-bottom: 1rem; font-size: 0.85rem; color: var(--sap-text-muted, #5b738b); }
.card-body { padding: 0.5rem 1.5rem 1.5rem; }

.policy-section { padding: 1.25rem 0; }
.policy-section + .policy-section { border-top: 1px solid var(--sap-border, #e4e7eb); }
.policy-section:first-child { padding-top: 0.75rem; }

h2 { font-size: 1.05rem; margin: 0 0 0.75rem; }
h3 { font-size: 0.9rem; margin: 1rem 0 0.4rem; }
p { line-height: 1.6; margin: 0 0 0.75rem; }
.address { line-height: 1.5; }
.muted { color: var(--sap-text-muted, #5b738b); font-size: 0.9rem; }
ul { margin: 0 0 0.75rem; padding-left: 1.25rem; line-height: 1.6; }
li { margin-bottom: 0.25rem; }
</style>
