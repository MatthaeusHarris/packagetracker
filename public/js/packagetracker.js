/**
 * Created by mharris on 2/21/15.
 */
console.log(window.location);
$("#navbar .nav li").each(function(index, element) {
    var e = $(element);
    if (e.find('a').first().prop('href') == window.location.href) {
        e.addClass('active');
    } else {
        e.removeClass('active');
    }
});