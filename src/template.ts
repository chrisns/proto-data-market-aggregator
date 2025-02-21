interface ListingProvider {
    title: string,
    description: string,
}

interface ListingResult {
    id: string;
    title: string;
    description: string;
    subtitle: string;
    provider: ListingProvider;
    url: string;
    source: string;
    updated: string;
}

interface QueryStats {
    source: string;
    durationMs: number;
    error?: string;
    resultCount: number;
}

const result_template = (results: ListingResult[]) => {
    return results.map(result => {
        return `
    <li class="dataset-result__list">
      <div class="d-flex justify-content-between align-items-center mb-0">
          <h3 class="dataset-title govuk-heading-s mb-0">
              <a class="govuk-link" href="${result.url}">${result.title}</a>
          </h3>
              <strong class="govuk-tag govuk-tag--blue">Published</strong>
      </div>

      <p class="govuk-!-font-weight-bold govuk-hint govuk-!-font-size-16">
          <span class="govuk-visually-hidden">Organisation: </span>${result.provider.title}
      </p>
      <div>
      <strong class="govuk-tag govuk-tag--grey" > ${result.source} </strong>
        </div>
        <div class="govuk-!-margin-bottom-2 govuk-!-margin-top-2" >
          <p class="govuk-body-s" >
          ${result.description.substring(0, 100)}...
  </p>
  <p class= "govuk-hint govuk-!-font-size-16" > Last Updated: ${result.updated} </p>
  </div>
  </li>`
    }).join("\n")
}

const stats_template = (stats: QueryStats[]) => {
    if (!stats.length) return '';

    return `
    <div class="govuk-!-margin-bottom-4">
        <h2 class="govuk-heading-s">Query Stats:</h2>
        <ul class="govuk-list">
            ${stats.map(stat => `
                <li class="govuk-!-margin-bottom-2">
                    <div class="govuk-!-margin-bottom-1">
                        <strong>${stat.source}</strong>: ${stat.durationMs}ms, ${stat.resultCount} results
                    </div>
                    ${stat.error ? `
                        <div class="govuk-error-message">
                            <span class="govuk-visually-hidden">Error:</span>
                            ${stat.error}
                        </div>
                    ` : ''}
                </li>
            `).join('\n')}
        </ul>
    </div>`
}

const template = (searchterm: string, results: ListingResult[], stats: QueryStats[]) => {
    return `<!DOCTYPE html>
<html lang="en">
<head>

<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Data set Results -  Data Marketplace</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0b0c0c">
<meta http-equiv="X-UA-Compatible" content="IE=edge">

<link rel="shortcut icon" sizes="16x16 32x32 48x48" href="https://datamarketplace.gov.uk/lib/govuk-frontend/dist/govuk/assets/images/favicon.ico" type="image/x-icon">

<link rel="stylesheet" href="https://datamarketplace.gov.uk/lib/bootstrap/dist/css/bootstrap.min.css" />
<link rel="stylesheet" href="https://datamarketplace.gov.uk/lib/govuk-frontend/dist/govuk/govuk-frontend.min.css">
<link rel="stylesheet" href="https://datamarketplace.gov.uk/css/site.css?v=Vd7D5LXtUBbAA63hSnmCMYo12gL9vArQpEfVam5Q6jY" />
    
    <link rel="stylesheet" href="https://datamarketplace.gov.uk/css/dataset-results.min.css" />
    <style>
        .suggestions {
            list-style-type: none;
            margin: 0;
            padding: 0;
            border: 1px solid #ccc;
            max-height: 150px;
            overflow-y: auto;
            position: absolute;
            background-color: white;
            width: calc(100% - 30px);
            left: 0;
            top: 100%;
            z-index: 1000;
            box-sizing: border-box;
        }

            .suggestions li {
                padding: 10px;
                cursor: pointer;
            }

                .suggestions li:hover {
                    background-color: #f0f0f0;
                }
    </style>

<!--[if !IE 8]><!-->
    <link rel="stylesheet" href="https://datamarketplace.gov.uk/govuk-frontend-4.8.0.min.css">
<!--<![endif]-->
<!--[if IE 8]>
    <link rel = "stylesheet" href="https://datamarketplace.gov.uk/govuk-frontend-ie8-4.8.0.min.css">
<![endif]-->
</head>
<body class="govuk-template__body">
<script>document.body.className = document.body.className + ' js-enabled';</script>
    <header class="govuk-header" role="banner" data-module="govuk-header">
    <a href="javascript:;" class="govuk-skip-link"  onclick="document.getElementsByClassName('govuk-main-wrapper')[0].scrollIntoView({behavior:'smooth'})" data-module="govuk-skip-link">Skip to main content</a>
    <div class="govuk-header__container govuk-width-container">
        <div class="govuk-header__logo">
            <a href="https://www.gov.uk" class="govuk-header__link govuk-header__link--homepage">
                <svg focusable="false"
                     role="img"
                     class="govuk-header__logotype"
                     xmlns="http://www.w3.org/2000/svg"
                     viewBox="0 0 148 30"
                     height="30"
                     width="148"
                     aria-label="GOV.UK">
                    <title>GOV.UK</title>
                    <path d="M22.6 10.4c-1 .4-2-.1-2.4-1-.4-.9.1-2 1-2.4.9-.4 2 .1 2.4 1s-.1 2-1 2.4m-5.9 6.7c-.9.4-2-.1-2.4-1-.4-.9.1-2 1-2.4.9-.4 2 .1 2.4 1s-.1 2-1 2.4m10.8-3.7c-1 .4-2-.1-2.4-1-.4-.9.1-2 1-2.4.9-.4 2 .1 2.4 1s0 2-1 2.4m3.3 4.8c-1 .4-2-.1-2.4-1-.4-.9.1-2 1-2.4.9-.4 2 .1 2.4 1s-.1 2-1 2.4M17 4.7l2.3 1.2V2.5l-2.3.7-.2-.2.9-3h-3.4l.9 3-.2.2c-.1.1-2.3-.7-2.3-.7v3.4L15 4.7c.1.1.1.2.2.2l-1.3 4c-.1.2-.1.4-.1.6 0 1.1.8 2 1.9 2.2h.7c1-.2 1.9-1.1 1.9-2.1 0-.2 0-.4-.1-.6l-1.3-4c-.1-.2 0-.2.1-.3m-7.6 5.7c.9.4 2-.1 2.4-1 .4-.9-.1-2-1-2.4-.9-.4-2 .1-2.4 1s0 2 1 2.4m-5 3c.9.4 2-.1 2.4-1 .4-.9-.1-2-1-2.4-.9-.4-2 .1-2.4 1s.1 2 1 2.4m-3.2 4.8c.9.4 2-.1 2.4-1 .4-.9-.1-2-1-2.4-.9-.4-2 .1-2.4 1s0 2 1 2.4m14.8 11c4.4 0 8.6.3 12.3.8 1.1-4.5 2.4-7 3.7-8.8l-2.5-.9c.2 1.3.3 1.9 0 2.7-.4-.4-.8-1.1-1.1-2.3l-1.2 4c.7-.5 1.3-.8 2-.9-1.1 2.5-2.6 3.1-3.5 3-1.1-.2-1.7-1.2-1.5-2.1.3-1.2 1.5-1.5 2.1-.1 1.1-2.3-.8-3-2-2.3 1.9-1.9 2.1-3.5.6-5.6-2.1 1.6-2.1 3.2-1.2 5.5-1.2-1.4-3.2-.6-2.5 1.6.9-1.4 2.1-.5 1.9.8-.2 1.1-1.7 2.1-3.5 1.9-2.7-.2-2.9-2.1-2.9-3.6.7-.1 1.9.5 2.9 1.9l.4-4.3c-1.1 1.1-2.1 1.4-3.2 1.4.4-1.2 2.1-3 2.1-3h-5.4s1.7 1.9 2.1 3c-1.1 0-2.1-.2-3.2-1.4l.4 4.3c1-1.4 2.2-2 2.9-1.9-.1 1.5-.2 3.4-2.9 3.6-1.9.2-3.4-.8-3.5-1.9-.2-1.3 1-2.2 1.9-.8.7-2.3-1.2-3-2.5-1.6.9-2.2.9-3.9-1.2-5.5-1.5 2-1.3 3.7.6 5.6-1.2-.7-3.1 0-2 2.3.6-1.4 1.8-1.1 2.1.1.2.9-.3 1.9-1.5 2.1-.9.2-2.4-.5-3.5-3 .6 0 1.2.3 2 .9l-1.2-4c-.3 1.1-.7 1.9-1.1 2.3-.3-.8-.2-1.4 0-2.7l-2.9.9C1.3 23 2.6 25.5 3.7 30c3.7-.5 7.9-.8 12.3-.8m28.3-11.6c0 .9.1 1.7.3 2.5.2.8.6 1.5 1 2.2.5.6 1 1.1 1.7 1.5.7.4 1.5.6 2.5.6.9 0 1.7-.1 2.3-.4s1.1-.7 1.5-1.1c.4-.4.6-.9.8-1.5.1-.5.2-1 .2-1.5v-.2h-5.3v-3.2h9.4V28H55v-2.5c-.3.4-.6.8-1 1.1-.4.3-.8.6-1.3.9-.5.2-1 .4-1.6.6s-1.2.2-1.8.2c-1.5 0-2.9-.3-4-.8-1.2-.6-2.2-1.3-3-2.3-.8-1-1.4-2.1-1.8-3.4-.3-1.4-.5-2.8-.5-4.3s.2-2.9.7-4.2c.5-1.3 1.1-2.4 2-3.4.9-1 1.9-1.7 3.1-2.3 1.2-.6 2.6-.8 4.1-.8 1 0 1.9.1 2.8.3.9.2 1.7.6 2.4 1s1.4.9 1.9 1.5c.6.6 1 1.3 1.4 2l-3.7 2.1c-.2-.4-.5-.9-.8-1.2-.3-.4-.6-.7-1-1-.4-.3-.8-.5-1.3-.7-.5-.2-1.1-.2-1.7-.2-1 0-1.8.2-2.5.6-.7.4-1.3.9-1.7 1.5-.5.6-.8 1.4-1 2.2-.3.8-.4 1.9-.4 2.7zM71.5 6.8c1.5 0 2.9.3 4.2.8 1.2.6 2.3 1.3 3.1 2.3.9 1 1.5 2.1 2 3.4s.7 2.7.7 4.2-.2 2.9-.7 4.2c-.4 1.3-1.1 2.4-2 3.4-.9 1-1.9 1.7-3.1 2.3-1.2.6-2.6.8-4.2.8s-2.9-.3-4.2-.8c-1.2-.6-2.3-1.3-3.1-2.3-.9-1-1.5-2.1-2-3.4-.4-1.3-.7-2.7-.7-4.2s.2-2.9.7-4.2c.4-1.3 1.1-2.4 2-3.4.9-1 1.9-1.7 3.1-2.3 1.2-.5 2.6-.8 4.2-.8zm0 17.6c.9 0 1.7-.2 2.4-.5s1.3-.8 1.7-1.4c.5-.6.8-1.3 1.1-2.2.2-.8.4-1.7.4-2.7v-.1c0-1-.1-1.9-.4-2.7-.2-.8-.6-1.6-1.1-2.2-.5-.6-1.1-1.1-1.7-1.4-.7-.3-1.5-.5-2.4-.5s-1.7.2-2.4.5-1.3.8-1.7 1.4c-.5.6-.8 1.3-1.1 2.2-.2.8-.4 1.7-.4 2.7v.1c0 1 .1 1.9.4 2.7.2.8.6 1.6 1.1 2.2.5.6 1.1 1.1 1.7 1.4.6.3 1.4.5 2.4.5zM88.9 28 83 7h4.7l4 15.7h.1l4-15.7h4.7l-5.9 21h-5.7zm28.8-3.6c.6 0 1.2-.1 1.7-.3.5-.2 1-.4 1.4-.8.4-.4.7-.8.9-1.4.2-.6.3-1.2.3-2v-13h4.1v13.6c0 1.2-.2 2.2-.6 3.1s-1 1.7-1.8 2.4c-.7.7-1.6 1.2-2.7 1.5-1 .4-2.2.5-3.4.5-1.2 0-2.4-.2-3.4-.5-1-.4-1.9-.9-2.7-1.5-.8-.7-1.3-1.5-1.8-2.4-.4-.9-.6-2-.6-3.1V6.9h4.2v13c0 .8.1 1.4.3 2 .2.6.5 1 .9 1.4.4.4.8.6 1.4.8.6.2 1.1.3 1.8.3zm13-17.4h4.2v9.1l7.4-9.1h5.2l-7.2 8.4L148 28h-4.9l-5.5-9.4-2.7 3V28h-4.2V7zm-27.6 16.1c-1.5 0-2.7 1.2-2.7 2.7s1.2 2.7 2.7 2.7 2.7-1.2 2.7-2.7-1.2-2.7-2.7-2.7z"></path>
                </svg>
            </a>
        </div>
        <div class="govuk-header__content">
            <a href="https://github.com/chrisns/proto-data-market-aggregator" class="govuk-header__link govuk-header__service-name">
                CNS POC - Data Marketplace
            </a>
        </div>
    </div>
</header>

    <nav id="app-navigation" class="app-navigation js-app-navigation govuk-clearfix" role="navigation" aria-labelledby="app-navigation-heading">
    <h2 class="govuk-visually-hidden" id="app-navigation-heading">Menu</h2>
    <div class="govuk-width-container">
        <ul class="app-navigation__list landing-navigation__list app-width-container float-start">
            <li class="app-navigation__list-item">
                <a class="govuk-link govuk-link--no-visited-state govuk-link--no-underline app-navigation__link js-app-navigation__link" href="https://github.com/chrisns/proto-data-market-aggregator/">
                    Home
                </a>
            </li>

            <li class="app-navigation__list-item ">
                <a class="govuk-link govuk-link--no-visited-state govuk-link--no-underline app-navigation__link js-app-navigation__link" href="https://datamarketplace.gov.uk/catalogdata/getcddodataassets">
                    Find data assets
                </a>
            </li>

            <li class="app-navigation__list-item ">
                <a class="govuk-link govuk-link--no-visited-state govuk-link--no-underline app-navigation__link js-app-navigation__link" href="https://datamarketplace.gov.uk/learn">
                    Learn
                </a>
            </li>
        </ul>

        <ul class="app-navigation__list app-width-container float-end">
                    <li class="app-navigation__list-item">
                        <a class="govuk-link govuk-link--no-visited-state govuk-link--no-underline app-navigation__link js-app-navigation__link" href="https://datamarketplace.gov.uk/userprofile">
                            firstname lastname
                        </a>
                    </li>
                <li class="app-navigation__list-item">
                    <a href="https://datamarketplace.gov.uk/auth/signout?handler=SignOut" class="govuk-link govuk-link--no-visited-state govuk-link--no-underline app-navigation__link js-app-navigation__link">Sign out</a>
                </li>
        </ul>

    </div>
</nav>

    <main b-dhtna8gv7a role="main" id="main-content">
        <div b-dhtna8gv7a class="govuk-width-container govuk-phase-banner">
            <p b-dhtna8gv7a class="govuk-phase-banner__content">
                <strong b-dhtna8gv7a class="govuk-tag govuk-phase-banner__content__tag">
                    Beta
                </strong>
                <span b-dhtna8gv7a class="govuk-phase-banner__text">
                    This is a new service – your <a b-dhtna8gv7a class="govuk-link" href="https://docs.google.com/forms/d/e/1FAIpQLSforohZAzyIgaKnkthTDRWzpnrh10eqGmNZRSwOLZDE0DZYEQ/viewform">feedback</a> will help us to improve it.
                </span>
            </p>
        </div>
        <div b-dhtna8gv7a class="govuk-width-container">
            





<div class="govuk-width-container">
    <a class="govuk-back-link" href="javascript:window.history.back()">Back</a>
    <div class="govuk-main-wrapper">
        <h1 class="govuk-heading-xl govuk-!-margin-bottom-4">
            Find government data
        </h1>
        <form method="get" action="/" novalidate="">
            <div class="govuk-grid-row mb-5">
                <div class="govuk-grid-column-two-thirds">
                    <div class="govuk-form-group mb-2 search-input">
                        <div class="govuk-input__wrapper" style="position: relative;">
                            <input aria-label="Search data description" placeholder="${searchterm}" class="govuk-input govuk-input--width-30" id="catalogDataSearchInput" name="search" type="text" list="catalogDataSearchList" autocomplete="off">
                            <button title="datasetSearchResultsBtn" class="search-button" type="submit" enterkeyhint="search">
                                <svg class="search-button__icon" width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                                    <circle cx="12.0161" cy="11.0161" r="8.51613" stroke="currentColor" stroke-width="3"></circle>
                                    <line x1="17.8668" y1="17.3587" x2="26.4475" y2="25.9393" stroke="currentColor" stroke-width="3"></line>
                                </svg>
                            </button>
                            <ul id="catalogDataSearchList" class="suggestions" style="display:none;"></ul>
                        </div>
                    </div>
                </div>
            </div>

            <div class="govuk-grid-row">
                <div class="govuk-grid-column-one-third">
                    <div class="accordion accordion-flush accordion-filter" id="accordionFlushExample">
                        <div class="accordion-item">
                            <h2 class="accordion-header" id="flush-topics">
                                <button class="accordion-button collapsed govuk-link" type="button" data-bs-toggle="collapse" data-bs-target="#flush-collapseTopics" aria-expanded="false" aria-controls="flush-collapseTopics">
                                    Topics
                                </button>
                            </h2>
                            <div id="flush-collapseTopics" class="accordion-collapse collapse" aria-labelledby="flush-topics" data-bs-parent="#accordionFlushExample">
                                <div class="accordion-body">
                                    <div class="govuk-form-group">
                                        <fieldset class="govuk-fieldset">
                                            <legend class="govuk-fieldset__legend govuk-fieldset__legend--m visually-hidden">
                                                <h1 class="govuk-fieldset__heading">
                                                    Topics
                                                </h1>
                                            </legend>
                                            <div class="govuk-checkboxes govuk-checkboxes--small" data-module="govuk-checkboxes">
                                                        <div class="govuk-checkboxes__item">
                                                            <input class="govuk-checkboxes__input" id="Business, economics and finance" name="Themes" type="checkbox" value="Business, economics and finance" >
                                                            <label class="govuk-label govuk-checkboxes__label" for="Business, economics and finance">
                                                                Business, economics and finance
                                                            </label>
                                                        </div>
                                                        <div class="govuk-checkboxes__item">
                                                            <input class="govuk-checkboxes__input" id="Crime and justice" name="Themes" type="checkbox" value="Crime and justice" >
                                                            <label class="govuk-label govuk-checkboxes__label" for="Crime and justice">
                                                                Crime and justice
                                                            </label>
                                                        </div>
                                                        <div class="govuk-checkboxes__item">
                                                            <input class="govuk-checkboxes__input" id="Education" name="Themes" type="checkbox" value="Education" >
                                                            <label class="govuk-label govuk-checkboxes__label" for="Education">
                                                                Education
                                                            </label>
                                                        </div>
                                                        <div class="govuk-checkboxes__item">
                                                            <input class="govuk-checkboxes__input" id="Energy" name="Themes" type="checkbox" value="Energy" >
                                                            <label class="govuk-label govuk-checkboxes__label" for="Energy">
                                                                Energy
                                                            </label>
                                                        </div>
                                                        <div class="govuk-checkboxes__item">
                                                            <input class="govuk-checkboxes__input" id="Environment and nature" name="Themes" type="checkbox" value="Environment and nature" >
                                                            <label class="govuk-label govuk-checkboxes__label" for="Environment and nature">
                                                                Environment and nature
                                                            </label>
                                                        </div>
                                                        <div class="govuk-checkboxes__item">
                                                            <input class="govuk-checkboxes__input" id="Government and public sector" name="Themes" type="checkbox" value="Government and public sector" >
                                                            <label class="govuk-label govuk-checkboxes__label" for="Government and public sector">
                                                                Government and public sector
                                                            </label>
                                                        </div>
                                                        <div class="govuk-checkboxes__item">
                                                            <input class="govuk-checkboxes__input" id="Health and care" name="Themes" type="checkbox" value="Health and care" >
                                                            <label class="govuk-label govuk-checkboxes__label" for="Health and care">
                                                                Health and care
                                                            </label>
                                                        </div>
                                                        <div class="govuk-checkboxes__item">
                                                            <input class="govuk-checkboxes__input" id="Population and society" name="Themes" type="checkbox" value="Population and society" >
                                                            <label class="govuk-label govuk-checkboxes__label" for="Population and society">
                                                                Population and society
                                                            </label>
                                                        </div>
                                            </div>
                                        </fieldset>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="accordion-item">
                            <h2 class="accordion-header" id="flush-organisations">
                                <button class="accordion-button collapsed govuk-link" type="button" data-bs-toggle="collapse" data-bs-target="#flush-collapseOrganisations" aria-expanded="false" aria-controls="flush-collapseOrganisations">
                                    Organisations
                                </button>
                            </h2>
                            <div id="flush-collapseOrganisations" class="accordion-collapse collapse" aria-labelledby="flush-organisations" data-bs-parent="#accordionFlushExample">
                                <div class="accordion-body">
                                    <div class="govuk-form-group">
                                        <fieldset class="govuk-fieldset">
                                            <legend class="govuk-fieldset__legend govuk-fieldset__legend--m visually-hidden">
                                                <h1 class="govuk-fieldset__heading">
                                                    Organisations
                                                </h1>
                                            </legend>
                                            <div class="govuk-checkboxes govuk-checkboxes--small filter-list" data-module="govuk-checkboxes">
                                                        <div class="govuk-checkboxes__item">
                                                            <input class="govuk-checkboxes__input" id="Cabinet Office" name="Creator" type="checkbox" value="Cabinet Office" >
                                                            <label class="govuk-label govuk-checkboxes__label" for="Cabinet Office">
                                                                Cabinet Office
                                                            </label>
                                                        </div>
                                                        <div class="govuk-checkboxes__item">
                                                            <input class="govuk-checkboxes__input" id="Department for Environment Food &amp; Rural Affairs" name="Creator" type="checkbox" value="Department for Environment Food &amp; Rural Affairs" >
                                                            <label class="govuk-label govuk-checkboxes__label" for="Department for Environment Food &amp; Rural Affairs">
                                                                Department For Environment Food &amp; Rural Affairs
                                                            </label>
                                                        </div>
                                                        <div class="govuk-checkboxes__item">
                                                            <input class="govuk-checkboxes__input" id="department-for-education" name="Creator" type="checkbox" value="department-for-education" >
                                                            <label class="govuk-label govuk-checkboxes__label" for="department-for-education">
                                                                Department For Education
                                                            </label>
                                                        </div>
                                                        <div class="govuk-checkboxes__item">
                                                            <input class="govuk-checkboxes__input" id="HM Revenue &amp; Customs" name="Creator" type="checkbox" value="HM Revenue &amp; Customs" >
                                                            <label class="govuk-label govuk-checkboxes__label" for="HM Revenue &amp; Customs">
                                                                HM Revenue &amp; Customs
                                                            </label>
                                                        </div>
                                                        <div class="govuk-checkboxes__item">
                                                            <input class="govuk-checkboxes__input" id="HM Treasury" name="Creator" type="checkbox" value="HM Treasury" >
                                                            <label class="govuk-label govuk-checkboxes__label" for="HM Treasury">
                                                                HM Treasury
                                                            </label>
                                                        </div>
                                                        <div class="govuk-checkboxes__item">
                                                            <input class="govuk-checkboxes__input" id="Home Office" name="Creator" type="checkbox" value="Home Office" >
                                                            <label class="govuk-label govuk-checkboxes__label" for="Home Office">
                                                                Home Office
                                                            </label>
                                                        </div>
                                                        <div class="govuk-checkboxes__item">
                                                            <input class="govuk-checkboxes__input" id="ministry-of-housing-communities-local-government" name="Creator" type="checkbox" value="ministry-of-housing-communities-local-government" >
                                                            <label class="govuk-label govuk-checkboxes__label" for="ministry-of-housing-communities-local-government">
                                                                Ministry Of Housing Communities Local Government
                                                            </label>
                                                        </div>
                                                        <div class="govuk-checkboxes__item">
                                                            <input class="govuk-checkboxes__input" id="ministry-of-justice" name="Creator" type="checkbox" value="ministry-of-justice" >
                                                            <label class="govuk-label govuk-checkboxes__label" for="ministry-of-justice">
                                                                Ministry Of Justice
                                                            </label>
                                                        </div>
                                                        <div class="govuk-checkboxes__item">
                                                            <input class="govuk-checkboxes__input" id="office-for-national-statistics" name="Creator" type="checkbox" value="office-for-national-statistics" >
                                                            <label class="govuk-label govuk-checkboxes__label" for="office-for-national-statistics">
                                                                Office For National Statistics
                                                            </label>
                                                        </div>
                                            </div>
                                        </fieldset>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="accordion-item">
                            <h2 class="accordion-header" id="flush-asset">
                                <button class="accordion-button collapsed govuk-link " type="button" data-bs-toggle="collapse" data-bs-target="#flush-collapseAsset" aria-expanded="false" aria-controls="flush-collapseAsset">
                                    Asset Types
                                </button>
                            </h2>
                            <div id="flush-collapseAsset" class="accordion-collapse collapse" aria-labelledby="flush-asset" data-bs-parent="#accordionFlushExample">
                                <div class="accordion-body">
                                    <div class="govuk-form-group">
                                        <fieldset class="govuk-fieldset">
                                            <legend class="govuk-fieldset__legend govuk-fieldset__legend--m visually-hidden">
                                                <h1 class="govuk-fieldset__heading">
                                                    Asset Types
                                                </h1>
                                            </legend>
                                            <div class="govuk-checkboxes govuk-checkboxes--small filter-list" data-module="govuk-checkboxes">
                                                <div class="govuk-checkboxes__item">
                                                    <input class="govuk-checkboxes__input" id="dataSet" name="DataAssetTypes" type="checkbox" value="DataSet" >
                                                    <label class="govuk-label govuk-checkboxes__label" for="dataSet">
                                                        Data set
                                                    </label>
                                                </div>
                                                <div class="govuk-checkboxes__item">
                                                    <input class="govuk-checkboxes__input" id="dataService" name="DataAssetTypes" type="checkbox" value="DataService" >
                                                    <label class="govuk-label govuk-checkboxes__label" for="dataService">
                                                        Data Service
                                                    </label>
                                                </div>
                                            </div>
                                        </fieldset>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="govuk-button-group">
                        <button type="submit" class="govuk-button" data-module="govuk-button">
                            Apply filter
                        </button>
                        <a class="govuk-link" href="https://datamarketplace.gov.uk/catalogdata/getcddodataassets">Clear all</a>
                    </div>
                    ${stats_template(stats)}
                </div>
                <div class="govuk-grid-column-two-thirds">
                    <h2 class="govuk-heading-s govuk-!-margin-bottom-2">${results.length} results</h2>
                    <hr />
                    <div class="govuk-grid-row">
                        <div class="govuk-grid-column-one-half">
                            <div class="govuk-form-group mb-0 d-inline-flex">
                                <label class="govuk-label" hidden for="pageSize">Sort by</label>
                                <div class="govuk-input__wrapper">
                                    <select class="govuk-select" name="sortOption" id="sortOption" aria-label="Sort by">
                                        <option value="Title|Ascending">
                                            Alphabetical A-Z
                                        </option>
                                        <option value="Title|Descending">
                                            Alphabetical Z-A
                                        </option>
                                        <option value="UpdatedOn|Descending" selected="selected">
                                            Modified (newest)
                                        </option>
                                        <option value="UpdatedOn|Ascending">
                                            Modified (oldest)
                                        </option>
                                        <option value="Relevance|Descending">
                                            Relevance
                                        </option>
                                    </select>
                                    <button class="govuk-button govuk-button--secondary govuk-input__suffix">Sort</button>
                                </div>
                            </div>
                        </div>
                        <div class="govuk-grid-column-one-half">
                            <div class="govuk-form-group mb-0 d-inline-flex float-end">
                                <label class="govuk-label"  for="pageSize" style="padding-right: 10px;padding-top: 7px;">
                                        Results Per Page
                                    </label>
                                <div class="govuk-input__wrapper">
                                    <select class="govuk-input" id="pageSize" aria-label="Select results per page" name="NumberOfRecords">
                                                <option value="10" selected>10</option>
                                                <option value="20">20</option>
                                                <option value="50">50</option>
                                                <option value="100">100</option>
                                        "(Results Per Page)"
                                    </select>
                                    <button class="govuk-button govuk-button--secondary govuk-input__suffix">
                                        Apply
                                         <span class="govuk-visually-hidden">
                                         results per page
                                         </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="dataset-result">
                        <ul class="govuk-!-margin-bottom-5">
                          ${result_template(results)}

                        </ul>

                    </div>
                        <nav class="govuk-pagination" role="navigation" aria-label="Pagination">
                            <ul class="govuk-pagination__list">

                                    <li class="govuk-pagination__item govuk-pagination__item--current">
                                        <button type="submit" class="govuk-link govuk-pagination__link" name="PageNumber" value="1">1</button>
                                    </li>
                                    <li class="govuk-pagination__item ">
                                        <button type="submit" class="govuk-link govuk-pagination__link" name="PageNumber" value="2">2</button>
                                    </li>
                                    <li class="govuk-pagination__item ">
                                        <button type="submit" class="govuk-link govuk-pagination__link" name="PageNumber" value="3">3</button>
                                    </li>

                                        <li class="govuk-pagination__item govuk-pagination__item--ellipses">...</li>
                                    <li class="govuk-pagination__item">
                                        <button type="submit" class="govuk-link govuk-pagination__link" name="PageNumber" value="10">10</button>
                                    </li>
                            </ul>

                                <div class="govuk-pagination__next">
                                    <button type="submit" class="govuk-link govuk-pagination__link" name="PageNumber" value="2" rel="next">
                                        <span class="govuk-pagination__link-title">
                                            <strong>Next</strong><span class="govuk-visually-hidden"> page</span>
                                        </span>
                                        <svg class="govuk-pagination__icon govuk-pagination__icon--next" xmlns="http://www.w3.org/2000/svg" height="13" width="15" aria-hidden="true" focusable="false" viewBox="0 0 15 13">
                                            <path d="m8.107-0.0078125-1.4136 1.414 4.2926 4.293h-12.986v2h12.896l-4.1855 3.9766 1.377 1.4492 6.7441-6.4062-6.7246-6.7266z"></path>
                                        </svg>
                                    </button>
                                </div>
                        </nav>
                </div>
            </div>
        </form>
    </div>
</div>
        </div>
    </main>

    <footer class="govuk-footer" role="contentinfo">
    <div class="govuk-width-container">
        <div class="govuk-footer__meta">
            <div class="govuk-footer__meta-item govuk-footer__meta-item--grow">
                <h1 id="support" class="govuk-heading-m">Get help and support</h1>
                <p class="govuk-body-s"><a class="govuk-footer__link" href="https://forms.gle/rpy2BMchHGDNVFfAA">Tell us what you need help with</a></p>

                <h2 class="govuk-visually-hidden">Footer links</h2>
                <ul class="govuk-footer__inline-list">
                    <li class="govuk-footer__inline-list-item">
                        <a class="govuk-footer__link" href="https://datamarketplace.gov.uk/about/accessibility">
                            Accessibility
                        </a>
                    </li>
                    <li class="govuk-footer__inline-list-item">
                        <a class="govuk-footer__link" href="https://datamarketplace.gov.uk/about/cookies">
                            Cookies
                        </a>
                    </li>
                    <li class="govuk-footer__inline-list-item">
                        <a class="govuk-footer__link" href="https://datamarketplace.gov.uk/about/privacy">
                            Privacy
                        </a>
                    </li>
                </ul>
                <svg aria-hidden="true"
                     focusable="false"
                     class="govuk-footer__licence-logo"
                     xmlns="http://www.w3.org/2000/svg"
                     viewBox="0 0 483.2 195.7"
                     height="17"
                     width="41">
                    <path fill="currentColor"
                          d="M421.5 142.8V.1l-50.7 32.3v161.1h112.4v-50.7zm-122.3-9.6A47.12 47.12 0 0 1 221 97.8c0-26 21.1-47.1 47.1-47.1 16.7 0 31.4 8.7 39.7 21.8l42.7-27.2A97.63 97.63 0 0 0 268.1 0c-36.5 0-68.3 20.1-85.1 49.7A98 98 0 0 0 97.8 0C43.9 0 0 43.9 0 97.8s43.9 97.8 97.8 97.8c36.5 0 68.3-20.1 85.1-49.7a97.76 97.76 0 0 0 149.6 25.4l19.4 22.2h3v-87.8h-80l24.3 27.5zM97.8 145c-26 0-47.1-21.1-47.1-47.1s21.1-47.1 47.1-47.1 47.2 21 47.2 47S123.8 145 97.8 145" />
                </svg>
                <span class="govuk-footer__licence-description">
                    All content is available under the
                    <a class="govuk-footer__link"
                       href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
                       rel="license">Open Government Licence v3.0</a>, except where otherwise stated
                </span>
            </div>
            <div class="govuk-footer__meta-item">
                <a class="govuk-footer__link govuk-footer__copyright-logo"
                   href="https://www.nationalarchives.gov.uk/information-management/re-using-public-sector-information/uk-government-licensing-framework/crown-copyright/">
                    © Crown copyright
                </a>
            </div>
        </div>
    </div>
</footer>
<script>
    document.body.className += " js-enabled" + ("noModule" in HTMLScriptElement.prototype ? " govuk-frontend-supported" : "");
</script>

</body>
</html>`
}



export default template;