<script setup>
import RingPill from './RingPill.vue'

defineEmits(['back'])
</script>

<template>
  <div class="about-page">
    <nav class="breadcrumb">
      <a href="#" @click.prevent="$emit('back')">Radar</a> &rsaquo; About
    </nav>

    <ui5-card>
      <ui5-card-header slot="header" title-text="About the SAP Development Tech Radar"></ui5-card-header>
      <div class="card-body">
        <section class="about-section">
          <h2>What is the SAP Development Tech Radar?</h2>
          <p>
            The SAP Development Tech Radar lists the SAP technologies and their usage recommendation
            (<em>ring assignment</em>). There are four rings, plus a deprecated state, with the following meanings:
          </p>
          <table class="ring-table">
            <tbody>
              <tr><th><RingPill ring="ADOPT" /></th><td>New technologies still in a stabilization and adoption phase. They may succeed a technology in ring USE, HOLD or STOP, and should be assessed as soon as possible if they succeed a HOLD or STOP technology.</td></tr>
              <tr><th><RingPill ring="USE" /></th><td>Technologies that are currently recommended. They are supported by SAP, considered stable, and have a defined roadmap. Even if a successor is in ring ADOPT, they remain the recommended choice for the time being.</td></tr>
              <tr><th><RingPill ring="HOLD" /></th><td>Technologies only recommended when there is no alternative, or whose usage is bound to a product or service with a defined EOL. Don't start new projects with them.</td></tr>
              <tr><th><RingPill ring="STOP" /></th><td>Obsolete technologies with a successor and a defined EOL date. Projects using them should switch to a technology in ring ADOPT or USE; continuing to use them carries a high risk regarding support, features and product continuation.</td></tr>
              <tr><th><RingPill ring="DEPRECATED" /></th><td>Technologies that are obsolete, have reached end of life, or no longer receive new features. They are removed from the radar itself and listed separately on the Deprecated page.</td></tr>
            </tbody>
          </table>
        </section>

        <section class="about-section">
          <h2>What is the purpose?</h2>
          <p>
            The SAP development Tech Radar is a tool that helps SAP developers make the right technology choice.
            It should make it easy to identify the right technology for new projects, and to recognize which
            currently used technologies should be replaced in the future; giving developers a way to
            position themselves and to justify and defend their technology choices. More broadly, it is meant to
            be a platform for SAP developers to exchange views on community-driven technology recommendations,
            make technology decisions transparent, and continuously evolve the overall SAP developer technology
            landscape.
          </p>
          <p>
            The information is not tailored to a specific version, e.g. NetWeaver 7.50 or S/4HANA 2023. The
            recommendations are generic and give guidance on what should be used, independent of the currently
            available technology stack. If the recommendation is to use RAP with OData v4 or CDS View Entity and
            your system does not support this, see this as an opportunity to drive change in your stack.
            Innovation from SAP will not stop, and the longer it takes you to adopt a technology in ring USE, the
            higher the risk of falling behind, for you as a developer, but also for your company. If your
            tech stack shows that you are mostly in the HOLD and STOP rings, try to move to a technology in ring
            USE.
          </p>
          <p>
            Based on the <a href="https://www.thoughtworks.com/radar" target="_blank" rel="noopener">pioneering work of ThoughtWorks &#8599;</a>,
            earlier versions of the SAP development Tech Radar were based on the Zalando Tech Radar for visualization.
          </p>
        </section>

        <section class="about-section">
          <h2>What technology is included in the SAP Development Tech Radar?</h2>
          <p>There are 4 quadrants:</p>
          <table class="quadrant-table">
            <tbody>
              <tr><th>UI</th><td>Technologies focused on the UI.</td></tr>
              <tr><th>Technology</th><td>Technologies that enable other tasks and do not fit in the other quadrants.</td></tr>
              <tr><th>Tools</th><td>Tools for SAP developers.</td></tr>
              <tr><th>Frameworks</th><td>Frameworks for developing SAP apps.</td></tr>
            </tbody>
          </table>
        </section>

        <section class="about-section">
          <h2>How to maintain it?</h2>
          <p>
            The Tech Radar is maintained by <em>Tobias Hofmann</em>. The idea is to continuously improve the tech
            radar by adding, removing and adjusting the listed technologies. The latest version of the tech radar
            will be published every 6 months.
          </p>
          <p>
            To ensure that the tech radar stays relevant, contributions from SAP developers and architects are
            welcome &mdash; adding a new technology, adjusting the ring of a listed technology, or updating the
            information provided. Assignment of technologies to rings is the outcome of ring change proposals,
            which are discussed and voted on.
          </p>
        </section>
      </div>
    </ui5-card>
  </div>
</template>

<style scoped>
.about-page { padding: 1.5rem; max-width: 900px; margin: 0 auto; }
.breadcrumb { margin-bottom: 1rem; font-size: 0.85rem; color: var(--sap-text-muted, #5b738b); }
.card-body { padding: 0.5rem 1.5rem 1.5rem; }

.about-section { padding: 1.25rem 0; }
.about-section + .about-section { border-top: 1px solid var(--sap-border, #e4e7eb); }
.about-section:first-child { padding-top: 0.75rem; }

h2 { font-size: 1.05rem; margin: 0 0 0.75rem; }
p { line-height: 1.6; margin: 0 0 0.75rem; }
ul { margin: 0 0 0.75rem; padding-left: 1.25rem; line-height: 1.6; }
li { margin-bottom: 0.25rem; }

.ring-table, .quadrant-table { border-collapse: collapse; width: 100%; margin: 0 0 0.75rem; }
.ring-table th, .ring-table td, .quadrant-table th, .quadrant-table td {
  text-align: left; padding: 0.5rem 0.75rem 0.5rem 0; border-bottom: 1px solid var(--sap-border, #e4e7eb);
}
.ring-table tr:last-child th, .ring-table tr:last-child td,
.quadrant-table tr:last-child th, .quadrant-table tr:last-child td { border-bottom: none; }
.ring-table th, .quadrant-table th { white-space: nowrap; font-weight: 600; width: 1%; }
.ring-table :deep(.ring-pill) { vertical-align: middle; }
</style>
