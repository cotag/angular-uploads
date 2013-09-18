'use strict';


describe('Circular:cirgress (directive)', function() {
    var element,
        bar,
        degrees,
        extract = /rotate\(([\d|.]+)deg\)/i,
        findDegrees = function(el) {
            return parseFloat(el.attr('style').match(extract)[1], 10);
        };

    beforeEach(function() {
        module('Circular');

        inject(function($rootScope, $compile) {
            $rootScope.progress = 0;
            $rootScope.total = 360;

            element = $compile('<cirgress progress="progress" total="total"></cirgress>')($rootScope);
            $rootScope.$digest();

            bar = element.find('div.co-progress > div:first-child');
        });
    });

    afterEach(function() {
        element.remove();
        degrees = undefined;
    });

    it('should link to variables on the parent scope', inject(function($rootScope) {
        // confirm initial state
        expect($rootScope.progress).toBe(0);
        expect($rootScope.total).toBe(360);
        degrees = findDegrees(bar);
        expect(degrees).toBe(0);


        // Update the progress
        $rootScope.progress = 10;
        $rootScope.$digest();

        expect($rootScope.progress).toBe(10);
        expect($rootScope.total).toBe(360);
        degrees = findDegrees(bar);
        expect(degrees).toBe(10);


        // update the total
        $rootScope.total = 300;
        $rootScope.progress = 11; // progress triggers changes (not total)
        $rootScope.$digest();

        expect($rootScope.progress).toBe(11);
        expect($rootScope.total).toBe(300);
        degrees = findDegrees(bar);
        expect(degrees).toBeGreaterThan(11);    // indicating that the total has changed
    }));

    it('should smoothly animate the transition forward from one side to the other', inject(function($rootScope) {
        // move progress bar past half way
        $rootScope.progress = 200;
        $rootScope.$digest();

        expect($rootScope.progress).toBe(200);
        degrees = findDegrees(bar);
        expect(degrees).toBe(180);      // stops here to transition the graphic


        // the animation end event should move the progress forward
        bar.trigger('transitionend');
        $rootScope.$digest();

        expect($rootScope.progress).toBe(200);
        degrees = findDegrees(bar);
        expect(degrees).toBe(200);
    }));

    it('should smoothly animate the transition backwards from one side to the other', inject(function($rootScope) {
        // move progress bar past half way
        $rootScope.progress = 200;
        $rootScope.$digest();
        bar.trigger('transitionend');
        $rootScope.$digest();


        // move the bar back
        $rootScope.progress = 100;
        $rootScope.$digest();

        expect($rootScope.progress).toBe(100);
        degrees = findDegrees(bar);
        expect(degrees).toBeGreaterThan(180);      // stops very close to 180
        expect(degrees).toBeLessThan(181);


        // the animation end event should complete the process
        bar.trigger('transitionend');
        $rootScope.$digest();

        expect($rootScope.progress).toBe(100);
        degrees = findDegrees(bar);
        expect(degrees).toBe(100);
    }));

    it('should handle further updates (in the same direction) during a transition phase', inject(function($rootScope) {
        // move progress bar past half way
        $rootScope.progress = 200;
        $rootScope.$digest();

        expect($rootScope.progress).toBe(200);
        degrees = findDegrees(bar);
        expect(degrees).toBe(180);      // stops here to transition the graphic


        // update again before the transition end event
        $rootScope.progress = 300;
        $rootScope.$digest();

        expect($rootScope.progress).toBe(300);
        degrees = findDegrees(bar);
        expect(degrees).toBe(180);


        // the animation end event should move the progress forward
        bar.trigger('transitionend');
        $rootScope.$digest();

        expect($rootScope.progress).toBe(300);
        degrees = findDegrees(bar);
        expect(degrees).toBe(300);


        // should work backwards too
        $rootScope.progress = 100;
        $rootScope.$digest();

        expect($rootScope.progress).toBe(100);
        degrees = findDegrees(bar);
        expect(degrees).toBeGreaterThan(180);      // stops very close to 180
        expect(degrees).toBeLessThan(181);

        // update again before the transition end event
        $rootScope.progress = 0;
        $rootScope.$digest();

        expect($rootScope.progress).toBe(0);
        degrees = findDegrees(bar);
        expect(degrees).toBeGreaterThan(180);      // stops very close to 180
        expect(degrees).toBeLessThan(181);

        // the animation end event should complete the process
        bar.trigger('transitionend');
        $rootScope.$digest();

        expect($rootScope.progress).toBe(0);
        degrees = findDegrees(bar);
        expect(degrees).toBe(0);
    }));
});

