/* global param_product_url */

let fetchControllers = [];

const update_product_url_selector = 'div.product_list div.col div.product-card div.position-relative a, div.product_list div.col div.product-card div.w-100 a';
const loader_class = 'opacity-50';
const product_list_selector = '#product_list';
const product_count_selector = '.category-product-count';
const page_heading_selector = '.page-heading .cat-name';

function hideFilterValueAction(toggleElement) {
    const list = toggleElement.closest('ul');
    if (list) {
        const listId = list.id;
        const expand = !!(window.layered_hidden_list && window.layered_hidden_list[listId]);
        function toggleDisplay(elements, show) {
            elements.forEach(el => {
                el.style.display = show ? '' : 'none';
            });
        }
        const hiddableElements = list.querySelectorAll('.hiddable');
        toggleDisplay(hiddableElements, expand);
        const hideActionLessElements = list.querySelectorAll('.hide-action.less');
        toggleDisplay(hideActionLessElements, expand);
        const hideActionMoreElements = list.querySelectorAll('.hide-action.more');
        toggleDisplay(hideActionMoreElements, !expand);
    }
}

function openCloseFilter() {
    document.addEventListener('click', function(e) {
        const clickedLink = e.target.closest('#layered_form span.layered_close a');
        if (clickedLink) {
            e.preventDefault();
            const iconElement = clickedLink.querySelector('i');
            const targetElement = document.getElementById(clickedLink.dataset.rel);
            if (iconElement && iconElement.classList.contains('ci-chevron-left')) {
                if (targetElement) {
                    targetElement.style.display = '';
                }
                iconElement.classList.remove('ci-chevron-left');
                iconElement.classList.add('ci-chevron-down');
                clickedLink.parentNode.classList.remove('closed');
            } else if (iconElement && iconElement.classList.contains('ci-chevron-down')) {
                if (targetElement) {
                    targetElement.style.display = 'none';
                }
                iconElement.classList.remove('ci-chevron-down');
                iconElement.classList.add('ci-chevron-left');
                clickedLink.parentNode.classList.add('closed');
            }
        }
    });
}

function paginationButton() {
    if (typeof window.current_friendly_url === 'undefined') {
        window.current_friendly_url = '#';
    }
    const paginationLinks = document.querySelectorAll('ul.pagination a');
    paginationLinks.forEach(function(link) {
        const computedStyle = window.getComputedStyle(link);
        if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || computedStyle.opacity === '0') {
            return;
        }
        let page;
        const href = link.getAttribute('href');
        if (href.search(/[&|\?]p=/) === -1) {
            page = 1;
        } else {
            const match = href.match(/[&|\?]p=(\d+)/);
            if (match && match[1]) {
                page = match[1];
            } else {
                page = 1;
            }
        }
        const location = window.location.href.replace(/#.*$/, '');
        const newHref = location + current_friendly_url.replace(/\/page-(\d+)/, '') + '/page-' + page;
        link.setAttribute('href', newHref);
    });
    document.querySelectorAll('ul.pagination li:not(.current):not(.disabled)').forEach(function(liElement) {
        let nbPage = 0;
        const currentPageLi = document.querySelector('ul.pagination li.current');
        let currentPageNumber = 0;
        if (currentPageLi) {
            const pageNumberContentElement = currentPageLi.querySelector('a') || currentPageLi.firstElementChild;
            if (pageNumberContentElement) {
                currentPageNumber = parseInt(pageNumberContentElement.innerHTML.replace(/<(.|\n)*?>/g, ''));
            }
        }
        if (liElement.id === 'pagination_next' || liElement.id === 'pagination_next_bottom') {
            nbPage = currentPageNumber + 1;
        } else if (liElement.id === 'pagination_previous' || liElement.id === 'pagination_previous_bottom') {
            nbPage = currentPageNumber - 1;
        }
        liElement.querySelectorAll('a').forEach(function(childLink) {
            childLink.addEventListener('click', function(event) {
                event.preventDefault();
                let p;
                if (nbPage === 0) {
                    p = parseInt(childLink.innerHTML.replace(/<(.|\n)*?>/g, ''));
                } else {
                    p = nbPage;
                }
                p = '&p=' + p;
                reloadContent(p);
                nbPage = 0;
                return false;
            });
        });
    });
}

function reloadContent(paramsPlus) {
    const $form = document.getElementById('layered_form');
    const $categoryProducts = document.querySelector(product_list_selector);
    stopFetchQuery();
    $form.classList.add('opacity-50');
    $categoryProducts.classList.add('opacity-50');
    let data = new FormData($form);
    ['price', 'weight'].forEach(function(sliderType) {
        const range_min_element = $form.querySelector('#layered_' + sliderType + '_range_min');
        const range_max_element = $form.querySelector('#layered_' + sliderType + '_range_max');
        if (range_min_element && range_max_element) {
            data.append('layered_' + sliderType + '_slider', range_min_element.value + '_' + range_max_element.value);
        }
    }); 
    const selectOptions = $form.querySelectorAll('select option');
    if (selectOptions) {
        selectOptions.forEach(function(optionElement) {
            const parentSelect = optionElement.parentElement;
            if (optionElement.id && parentSelect.value == optionElement.value) {
                data.append(optionElement.id, optionElement.value);
            }
        });
    }
    let productSort = document.querySelector('select.selectProductSort');
    if (productSort) {
        let selectedOption = productSort.options[productSort.selectedIndex];
        data.append('orderby', selectedOption.value.split(':')[0]);
        data.append('orderway', selectedOption.value.split(':')[1]);
    }
    let productCountShow = document.querySelector('select.nb_item[name="n"]');
    if (productCountShow) {
        data.append('n', productCountShow.value);
    }
    let slideUp = true;
    if (typeof paramsPlus === 'undefined' || !(typeof paramsPlus === 'string')) {
        paramsPlus = '';
        slideUp = false;
    }
    const controller = new AbortController();
    const signal = controller.signal;
    let url = window.baseDir + 'modules/blocklayered/blocklayered-ajax.php' + '?' + new URLSearchParams(data).toString() + paramsPlus;
    fetch(url, {
        method: 'GET',
        signal: signal
    }).then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }).then(result => {
        if (typeof result === 'undefined') {
            console.warn('reloadContent: AJAX response is undefined.');
            return;
        }
        if (result.meta_description !== '') {
            const metaDescriptionTag = document.querySelector('meta[name="description"]');
            if (metaDescriptionTag) {
                metaDescriptionTag.setAttribute('content', result.meta_description);
            }
        }
        if (result.meta_keywords !== '') {
            const metaKeywordsTag = document.querySelector('meta[name="keywords"]');
            if (metaKeywordsTag) {
                metaKeywordsTag.setAttribute('content', result.meta_keywords);
            }
        }
        if (result.meta_title !== '') {
            document.title = result.meta_title;
        }
        if (result.heading !== '') {
            document.querySelector(page_heading_selector).innerHTML = result.heading;
        }
        document.getElementById('layered_block_left').outerHTML = utf8_decode(result.filtersBlock);
        document.querySelector(product_count_selector).outerHTML = result.categoryCount;
        if (result.productList) {
            document.querySelector(product_list_selector).outerHTML = utf8_decode(result.productList);
        } else {
            document.querySelector(product_list_selector).innerHTML = '';
        }
        $form.classList.remove('opacity-50');
        $categoryProducts.classList.remove('opacity-50');
        if (result.pagination) {
            const pagination = document.getElementById('pagination');
            if (pagination) {
                pagination.outerHTML = result.pagination;
            }
        }
        if (result.pagination_bottom) {
            const pagination_bottom = document.getElementById('pagination_bottom');
            if (pagination_bottom) {
                pagination_bottom.outerHTML = result.pagination_bottom;
            }
        }
        window.filters = result.filters;
        initFilters();
        initNoUiSlders();
        window.current_friendly_url = result.current_friendly_url;
        if (typeof window.current_friendly_url === 'undefined') {
            window.current_friendly_url = '#';
        }
        ['price', 'weight'].forEach(function (sliderType) {
            const $sliderRangerMin = document.getElementById('layered_' + sliderType + '_range_min');
            const $sliderRangeMax = document.getElementById('layered_' + sliderType + '_range_max');
            if ($sliderRangerMin && $sliderRangeMax && typeof blocklayeredSliderName !== 'undefined') {
                const minLimit = $sliderRangerMin.getAttribute('limitValue');
                const maxLimit = $sliderRangeMax.getAttribute('limitValue');
                if (parseFloat($sliderRangerMin.value) !== parseFloat(minLimit) || parseFloat($sliderRangeMax.value) !== parseFloat(maxLimit)) {
                    window.current_friendly_url += '/' + blocklayeredSliderName[sliderType] + '-' + $sliderRangerMin.value + '-' + $sliderRangeMax.value;
                }
            }
        });
        paginationButton();
        if (history.pushState) {
            history.pushState(null, '', window.current_friendly_url);
        } else {
            window.location.hash = window.current_friendly_url;
        }
        window.lockLocationChecking = true;
        if (slideUp) {
            const scrollTarget = document.querySelector(product_list_selector);
            scrollTarget.scrollIntoView({behavior: 'smooth', block: 'start', inline: 'center'});
        }
        updateProductUrl();
        document.querySelectorAll('.hide-action').forEach(function(element) {
            hideFilterValueAction(element);
        });
    }).catch(error => {
        if (error.name === 'AbortError') {
            console.warn('Fetch aborted:', error.message);
        } else {
            console.error('Fetch error caught:', error);
        }
    });
    fetchControllers.push(controller);
}

function cancelFilter() {
    document.addEventListener('click', function(e) {
        const clickedLink = e.target.closest('#enabled_filters a');
        if (clickedLink) {
            const dataRel = clickedLink.dataset.rel;
            if (dataRel.search(/_slider$/) > 0) {
                const sliderElement = document.getElementById(dataRel);
                const minInput = document.getElementById(dataRel.replace(/_slider$/, '_range_min'));
                const maxInput = document.getElementById(dataRel.replace(/_slider$/, '_range_max'));
                if (minInput && maxInput) {
                    minInput.value = minInput.getAttribute('limitValue');
                    maxInput.value = maxInput.getAttribute('limitValue');
                    if (sliderElement && sliderElement.noUiSlider) {
                        sliderElement.noUiSlider.set([minInput.value, maxInput.value]);
                    }
                }
            } else {
                const targetElement = document.getElementById(dataRel);
                if (targetElement && targetElement.tagName === 'OPTION') {
                    const parentSelect = targetElement.parentNode;
                    if (parentSelect && parentSelect.tagName === 'SELECT') {
                        parentSelect.value = null;
                    }
                } else {
                    const elementById = document.getElementById(dataRel);
                    if (elementById) {
                        elementById.removeAttribute('checked');
                    }
                    const elementsByClass = document.querySelectorAll('.' + dataRel);
                    if (elementsByClass) {
                        elementsByClass.forEach(function(el) {
                            el.removeAttribute('checked');
                        });
                    }
                    const hiddenInput = document.querySelectorAll('#layered_form input[type="hidden"][name="' + dataRel + '"]');
                    if (hiddenInput) {
                        hiddenInput.forEach(function(inp) {
                            inp.remove();
                        });
                    }
                }
            }
            reloadContent();
        }
    });
}

function stopFetchQuery() {
    fetchControllers.forEach(controller => {
        controller.abort();
    });
    fetchControllers = [];
}

function initLocationChange(func, time) {
    if (!time) {
        time = 500;
    }
    let currentFriendlyUrl = getUrlParams();
    setInterval(function () {
        if (getUrlParams() != currentFriendlyUrl && !window.lockLocationChecking) {
            if (currentFriendlyUrl.replace(/^#(\/)?/, '') === getUrlParams().replace(/^#(\/)?/, '')) {
                return;
            }
            window.lockLocationChecking = true;
            reloadContent('&selected_filters=' + getUrlParams().replace(/^#/, ''));
        } else {
            window.lockLocationChecking = false;
            currentFriendlyUrl = getUrlParams();
        }
    }, time);
}

function getUrlParams() {
    if (typeof window.current_friendly_url === 'undefined') {
        window.current_friendly_url = '#';
    }
    let params = current_friendly_url;
    if (window.location.href.split('#').length == 2 && window.location.href.split('#')[1] != '') {
        params = '#' + window.location.href.split('#')[1];
    }
    return params;
}

function updateProductUrl() {
    if (typeof param_product_url !== 'undefined' && param_product_url !== '' && param_product_url !== '#') {
        document.querySelectorAll(update_product_url_selector).forEach(function(link) {
            link.setAttribute('href', link.getAttribute('href') + param_product_url);
        });
    }
}

/**
 * Copy of the php function utf8_decode()
 */
function utf8_decode(utfstr) {
    let res = '';
    for (let i = 0; i < utfstr.length;) {
        let c = utfstr.charCodeAt(i);
        let c1;
        let c2;
        if (c < 128) {
            res += String.fromCharCode(c);
            i++;
        } else if ((c > 191) && (c < 224)) {
            c1 = utfstr.charCodeAt(i + 1);
            res += String.fromCharCode(((c & 31) << 6) | (c1 & 63));
            i += 2;
        } else {
            c1 = utfstr.charCodeAt(i + 1);
            c2 = utfstr.charCodeAt(i + 2);
            res += String.fromCharCode(((c & 15) << 12) | ((c1 & 63) << 6) | (c2 & 63));
            i += 3;
        }
    }
    return res;
}

function initFilters() {
    if (typeof filters !== 'undefined') {
        for (let key in filters) {
            let filter;
            if (filters.hasOwnProperty(key)) {
                filter = filters[key];
            }
            if (typeof filter.slider !== 'undefined') {
                const minElement = document.getElementById('layered_' + filter.type + '_range_min');
                if (minElement) {
                    minElement.setAttribute('limitValue', filter.min);
                }
                const maxElement = document.getElementById('layered_' + filter.type + '_range_max');
                if (maxElement) {
                    maxElement.setAttribute('limitValue', filter.max);
                }
            }
            document.querySelectorAll('.layered_' + filter.type).forEach(element => {
                element.style.display = '';
            });
        }
    }
}

function initLayered() {
    initFilters();
    initNoUiSlders();
    initLocationChange();
    updateProductUrl();
    if (window.location.href.split('#').length === 2 && window.location.href.split('#')[1] !== '') {
        const params = window.location.href.split('#')[1];
        reloadContent('&selected_filters=' + params);
    }
}

(function () {
    function initBlockLayered() {
        if (typeof $ === 'undefined') {
            setTimeout(initBlockLayered, 100);
            return;
        }
        $(function () {
            cancelFilter();
            openCloseFilter();
            document.addEventListener('click', function(e) {
                const target = e.target.closest('#layered_form input.color-option[type="button"], #layered_form label.layered_color');
                if (target) {
                    const nameAttr = target.getAttribute('name');
                    const dataRelValue = target.dataset.rel;
                    const hiddenInputs = document.querySelectorAll('input[type="hidden"][name="' + nameAttr + '"]');
                    if (!hiddenInputs.length) {
                        const newHiddenInput = document.createElement('input');
                        newHiddenInput.type = 'hidden';
                        newHiddenInput.name = nameAttr;
                        newHiddenInput.value = dataRelValue;
                        document.getElementById('layered_form').appendChild(newHiddenInput);
                    } else {
                        hiddenInputs.forEach(function(hInp){
                            hInp.remove();
                        });
                    }
                    reloadContent();
                }
            });
            document.addEventListener('click', function(e) {
                const target = e.target.closest('#layered_form input[type="checkbox"]');
                if (target) {
                    reloadContent();
                }
            });
            document.addEventListener('change', function(e) {
                const target = e.target.closest('#layered_form select, #layered_form input[type=radio]');
                if (target) {
                    reloadContent();
                }
            });
            const handleRangeInputKeyup = function(e) {
                const target = e.target;
                if (target.matches('#layered_form input.layered_input_range')) {
                    if (target.dataset.timeoutId) {
                        window.clearTimeout(parseInt(target.dataset.timeoutId, 10));
                    }
                    const timeoutId = window.setTimeout(() => {
                        const filter = target.id.replace(/^layered_(.+)_range_.*$/, '$1');
                        const filterRangeMin = document.getElementById('layered_' + filter + '_range_min');
                        const filterRangeMax = document.getElementById('layered_' + filter + '_range_max');
                        if (filterRangeMin && filterRangeMax) {
                            let valueMin = parseFloat(filterRangeMin.value) || 0;
                            filterRangeMin.value = valueMin;
                            let valueMax = parseFloat(filterRangeMax.value) || 0;
                            filterRangeMax.value = valueMax;
                            if (valueMax < valueMin) {
                                filterRangeMin.value = valueMax;
                                filterRangeMax.value = valueMin;
                            }
                            reloadContent();
                        }
                    }, 500);
                    target.dataset.timeoutId = timeoutId.toString();
                }
            };
            document.removeEventListener('keyup', handleRangeInputKeyup);
            document.addEventListener('keyup', handleRangeInputKeyup);
            document.addEventListener('click', function(e) {
                const clickedRadio = e.target.closest('#layered_block_left .radio');
                if (clickedRadio) {
                    const colorButtons = clickedRadio.parentElement.querySelectorAll('input.color-option[type="button"]');
                    if (colorButtons) {
                        const radioName = clickedRadio.getAttribute('name');
                        colorButtons.forEach(function(item) {
                            if (item.classList.contains('on') && item.getAttribute('name') !== radioName) {
                                item.click();
                            }
                        });
                        return true;
                    }
                }
            });
            document.addEventListener('click', function(e) {
                const clickedLink = e.target.closest('#layered_block_left label:not(.layered_color) a');
                if (clickedLink) {
                    const parentOfLabel = clickedLink.parentElement.parentElement;
                    const inputElement = parentOfLabel ? parentOfLabel.querySelector('input') : null;
                    if (inputElement) {
                        const isDisabled = inputElement.hasAttribute('disabled');
                        if (!isDisabled) { 
                            inputElement.click(); 
                        }
                    }
                }
            });
            window.layered_hidden_list = {};
            document.addEventListener('click', function (e) {
                const clickedElement = e.target.closest('.hide-action');
                if (clickedElement) {
                    const parentUl = clickedElement.parentNode;
                    if (parentUl && parentUl.tagName === 'UL' && parentUl.id) {
                        const ulId = parentUl.id;
                        if (typeof (layered_hidden_list[ulId]) === 'undefined' || layered_hidden_list[ulId] === false) {
                            layered_hidden_list[ulId] = true;
                        } else {
                            layered_hidden_list[ulId] = false;
                        }
                        hideFilterValueAction(clickedElement);
                    }
                }
            });
            document.querySelectorAll('.hide-action').forEach(function (element) {
                hideFilterValueAction(element);
            });
            const handleProductSortChange = function(e) {
                if (e.target.matches('.selectProductSort')) {
                    const newValue = e.target.value;
                    const allSelectSortElements = document.querySelectorAll('.selectProductSort');
                    allSelectSortElements.forEach(selectElement => {
                        selectElement.value = newValue;
                    });
                    if (document.getElementById('layered_form')) {
                        reloadContent('forceSlide');
                    }
                }
            };
            document.removeEventListener('change', handleProductSortChange);
            document.addEventListener('change', handleProductSortChange);
            const handleProductNumberChange = function(e) {
                if (e.target.matches('select[name="n"]')) {
                    const newValue = e.target.value;
                    const allSelectSortElements = document.querySelectorAll('select[name="n"]');
                    allSelectSortElements.forEach(selectElement => {
                        selectElement.value = newValue;
                    });
                    if (document.getElementById('layered_form')) {
                        reloadContent('forceSlide');
                    }
                }
            };
            document.removeEventListener('change', handleProductNumberChange);
            document.addEventListener('change', handleProductNumberChange);
            paginationButton();
            initLayered();
        });
    }
    initBlockLayered();
}());

function initNoUiSlders() {
    const rangeSliderWidgets = document.querySelectorAll('[data-range-slider]');
    if (rangeSliderWidgets.length === 0) return;
    const htmlElement = document.documentElement;
    const direction = htmlElement.getAttribute('dir') === 'ltr' || htmlElement.getAttribute('dir') === 'rtl' ? htmlElement.getAttribute('dir') : 'ltr';
    rangeSliderWidgets.forEach(rangeSliderWidget => {
        const rangeSlider = rangeSliderWidget.querySelector('.range-slider-ui');
        const valueMinInput = rangeSliderWidget.querySelector('[data-range-slider-min]');
        const valueMaxInput = rangeSliderWidget.querySelector('[data-range-slider-max]');
        const currentSliderId = rangeSliderWidget.id;
        const filterMatch = currentSliderId.match(/^layered_(.+)_noUiSlider$/);
        let filterType = null;
        if (filterMatch && filterMatch[1]) {
            filterType = filterMatch[1];
        }
        let dataOptions = {};
        if (rangeSliderWidget.dataset.rangeSlider !== undefined) {
            try {
                dataOptions = JSON.parse(rangeSliderWidget.dataset.rangeSlider);
            } catch (e) {
                console.error('Error parsing data-range-slider JSON:', e);
                return;
            }
        }
        const options = {
            startMin: parseFloat(dataOptions.startMin),
            startMax: parseFloat(dataOptions.startMax),
            min: parseFloat(dataOptions.min),
            max: parseFloat(dataOptions.max),
            step: parseFloat(dataOptions.step), 
            pips: dataOptions.pips,
            tooltipPrefix: dataOptions.tooltipPrefix || '',
            tooltipSuffix: dataOptions.tooltipSuffix || '',
            precision: parseInt(dataOptions.precision) || 0 
        };        
        const start = options.startMax ? [options.startMin, options.startMax] : [options.startMin];
        const connect = options.startMax ? true : 'lower';
        if (rangeSlider && rangeSlider.noUiSlider) {
            rangeSlider.noUiSlider.destroy();
        }
        noUiSlider.create(rangeSlider, {
            direction: direction,
            start: start,
            connect: connect,
            step: options.step,
            pips: options.pips ? {
                mode: 'count',
                values: 5
            } : false,
            tooltips: true,
            range: {
                min: options.min,
                max: options.max
            },
            format: {
                to: function (value) {
                    return options.tooltipPrefix + parseFloat(value).toFixed(options.precision) + options.tooltipSuffix;
                },
                from: function (value) {
                    return Number(parseFloat(value).toFixed(options.precision)); 
                }
            }
        });
        rangeSlider.noUiSlider.on('update', (values, handle) => {
            stopFetchQuery(); 
            let value = values[handle];
            if (typeof value === 'string') {
                value = parseFloat(value.replace(/[^\d.-]/g, ''));
            }
            const formattedValue = value.toFixed(options.precision);
            if (handle === 1) {
                if (valueMaxInput) {
                    valueMaxInput.value = formattedValue;
                }
            } else {
                if (valueMinInput) {
                    valueMinInput.value = formattedValue;
                }
            }
            const rangeDisplayElement = document.getElementById(`layered_${filterType}_noUiRange`);
            if (rangeDisplayElement) {
                const currentFromValue = parseFloat(values[0].replace(/[^\d.-]/g, '')).toFixed(options.precision); 
                const currentToValue = parseFloat(values[1].replace(/[^\d.-]/g, '')).toFixed(options.precision);
                const displayFormat = parseInt(rangeSliderWidget.dataset.format, 10);
                const displayUnit = rangeSliderWidget.dataset.unit;
                let fromDisplay, toDisplay, spanDisplay;
                if (displayFormat < 5) { 
                    fromDisplay = window.formatCurrency(parseFloat(currentFromValue), displayFormat, displayUnit);
                    toDisplay = window.formatCurrency(parseFloat(currentToValue), displayFormat, displayUnit);
                } else {
                    fromDisplay = currentFromValue + displayUnit;
                    toDisplay = currentToValue + displayUnit;
                }
                if (window.isRtl) {
                    spanDisplay = toDisplay + ' - ' + fromDisplay;
                } else {
                    spanDisplay = fromDisplay + ' - ' + toDisplay;
                }
                rangeDisplayElement.innerHTML = spanDisplay;
            }
        });
        rangeSlider.noUiSlider.on('change', () => {
            reloadContent(); 
        });
        if (valueMinInput) {
            valueMinInput.addEventListener('change', function () {
                rangeSlider.noUiSlider.set([this.value, null]);
                reloadContent(); 
            });
        }
        if (valueMaxInput) {
            valueMaxInput.addEventListener('change', function () {
                rangeSlider.noUiSlider.set([null, this.value]);
                reloadContent(); 
            });
        }
    });
}
