# SAP development tech radar

## Introduction

This is the SAP development tech radar (SDTR). It categorizes SAP technologies and lists them in rings, indicating the current recommended state regarding its usage.

The SDTR consists of 4 quadrants: UI, Frameworks, Tools and Technology.

The rings are: ADOPT, USE, HOLD, STOP.

This is an opiniated list of technologies for SAP developers. The aim is to make implicit knowledge available from a variaty of sources like documentation, talks, presentations, examples, available in a single report. The radar is not static and is always only capturing the current state when it was published.

__The radar is independent from SAP.__

## Meaning and purpose

To get the most out of the SDTR, it is important to understand how it works. What it does, and what it does not. See also the section below on [how it differs from the Thoughtworks technology radar](#notes).

The SDTR is not about evaluating products. It is not about recommending a technology for a use case. It is not about comparing technology from different vendors. It is not about telling what must be evaluated or used.

The listed technology is for SAP developers and composes mainly technology from SAP. The intention of the SDTR is to help SAP developers to identify how aligned with the general recommendation of the SDTR the tech stack they work with is. Not only does it help to identify how far away the tech stack at a company is. Architects should check if there are plans to align the tech stack to the SDTR. Thus, SDTR offers value for companies. 

## Usage

**Important:**

- The rings are not an order. They do not mandate you to do something. USE does _not_ mean that this technology _must_ be used. As do the others not mandate any immediate actions.
- Technologies in the same quadrant and ring do not compete. The SDTR is not a product evaluation nor buyer guide.
- The radar is version independent. It shows that at the publishing time current recommendation. The technology version (e.g. NW 7.4 or S/4HANA 2023) in use does not matter for the correct usage.
- If you want to use the SDTR in your organization: use it as input and template and create your own, company specific technology radar. The SDTR does not include 3rd party software that needs to licensed seperately. If your organization uses e.g. a security scanner, testing tool and a low code framework from a partner, this should be added to any company specific tech radar.

The SDTR lists technologies and their positioning in the radar. It represents an overview of the current SAP technologies. The positioning of a technology in a ring does not mean that a company is having a good or bad technology stack. Each ring comes with the task to evaluate the currently used technology and the plans and roadmaps in effect for the developers and companies.

> _Example:_ The available tech stack to a SAP developer is NW 7.40. Apps are developed using SEGW, CDS Views and OData v2. While this is correct for the NW 7.40 stack, from a SDTR perspective, it should be RAP, OData v2 or v4 and CDS View Entity. As long as this is known and treated by the customer via an upgrade strategy to get to S/4HANA and how to update their development guidelines, this is OK.

The rings STOP and HOLD indicate that there should be a plan on how to treat these technologies. Is there a plan to move to a successor? Are the products using it in EOL and will be replaced? Is there a transformation strategy in place to maybe adopt a technology in USE or ADOPT ring? If all technology currently used by a developer are in these rings, this does not mean that this is per se a bad situation. The question is: what is in place to move the technology available to be the one in ring USE?

> _Example:_ Solution Manager is in ring hold. You can still use it. For new projects it might not be the best fit. For migrating to S/4HANA it is recommended to use SolMan. With EOL of SolMan announced, companies should have some strategy to substitute SolMan.

## Rings

A technology normally progresses through all 4 rings, although this is not mandatory. But how is it assigned to a ring?

### Criteria

Criteria help to define where a technology is put in.

- Support. Is it supported? EOL announced? In active development? Roadmap available?
- Usage adoption. Generally available and used by developers and customers?
- Value. It is not about hyped technologies driven by shareholder demand. Focus is on developer reality.
- Usage recommendation. Is it the latest and greatest, proven technology? Is there information how to use it, what it offers out there (e.g. talks at events)?

Not all of the above criteria can be easily defined. How to measure if something is widely used? The voting process of the SDTR ensures a valid positioning.

### Ring positions

- **USE**: USE is the ring for technology recommended to use, supported and has a roadmap that will add new features to it.
- **ADOPT**: ADOPT is for technologies that may be newly announced, yet important, but still with a certain gap when it comes to usage adoption. It might be a successor to another technology. By far it is a technology that must be evaluated, or that must be used in a new project.
- **HOLD**: Technology in HOLD might be still absolutely valid for the time being. Yet, when a newer, better(?) altenative is available - see ring ADOPT or USE - , this should be used for new projects.
- **STOP**: For STOP, these are basically EOL or outdated and should not be used any longer. There must be a plan available on what to do with the solutions using this technology. Consider letting the technology phase out together with the EOL solution.

## Organization

The SDTR is not intended to be a one person project. To gain significant traction, it must be open. This is for once ensured by the publishing process that will be handled on the project page.

> _Outlook_

>The idea is to hand this project over to a yet to be founded organization. The members of this organization will then be responsible for curating the radar. **(ja, ein Verein ist in der Planung)**

## Notes

The SDTR is based on the idea of the [Thoughtworks technology radar](https://github.com/thoughtworks/build-your-own-radar). SDTR differs in some important aspects. 

In the Thoughtworks technology radar are comparing products. The rings show what they think what technology can be used, or what to do with it. The SDTR must be read differently. It cannot be used to compare technologies from different vendors (the vendor is almost always SAP). The rings are also not an order that this technology must be used. It is not to evalute new technology or to show what is now best practice.