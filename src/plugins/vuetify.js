import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'
import * as colors from 'vuetify/lib/util/colors'

export default createVuetify({
    components,
    directives,
    theme: {
        themes: {
            light: {
                colors: {
                    primary: '#54402d',
                    secondary: colors.grey.darken3,
                    accent: colors.brown.base,
                    background: '#d0c8c3',
                    surface: '#f2f0ee',
                },
            },
        },
    },
})