package main

import (
	"bytes"
	"fmt"
	"os"
	"strings"
	"text/template"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
)

type (
	errMsg error
)

type model struct {
	choices   []string // items on the to-do list
	textInput textinput.Model
	selected  map[int]struct{} // which to-do items are selected
	err       error
}

func main() {
	model := initialModel()
	p := tea.NewProgram(model)
	if _, err := p.Run(); err != nil {
		fmt.Printf("Alas, there's been an error: %v", err)
		os.Exit(1)
	}
}

func initialModel() model {
	ti := textinput.New()
	// ti.Placeholder = "Pikachu"
	ti.Focus()
	ti.CharLimit = 156
	ti.Width = 20

	return model{
		// Our to-do list is a grocery list
		choices:   []string{"Buy carrots", "Buy celery", "Buy kohlrabi"},
		textInput: ti,
		err:       nil,
		// A map which indicates which choices are selected. We're using
		// the  map like a mathematical set. The keys refer to the indexes
		// of the `choices` slice, above.
		selected: make(map[int]struct{}),
	}
}

func (m model) Init() tea.Cmd {
	// Just return `nil`, which means "no I/O right now, please."
	return textinput.Blink
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.Type {
		case tea.KeyEnter, tea.KeyCtrlC, tea.KeyEsc:
			tsxFile, _ := os.Create("./" + m.textInput.Value() + "/" + m.textInput.Value() + ".tsx")
			defer tsxFile.Close()
			scssFile, _ := os.Create("./" + m.textInput.Value() + "/" + m.textInput.Value() + ".tsx")
			defer scssFile.Close()

			var fileTemplate = `import s from './{{.ComponentName}}.module.scss';

export default function {{.ComponentName}}() {
	return (
		<div className={s.{{.ComponentName}}}>
			{{.ComponentName}}
		</div>
	);
}`

			var scssTemplate = `.{{.SCSSName}} {
	color: red;
}`

			parsedTsxTemplate, _ := template.New("file").Parse(fileTemplate)
			parsedScssTemplate, _ := template.New("scss").Parse(scssTemplate)

			type templateInput struct {
				ComponentName string
				SCSSName      string
			}

			parsedTsxTemplate.Execute(tsxFile, templateInput{
				ComponentName: m.textInput.Value(),
				SCSSName:      MakeFirstLowerCase(m.textInput.Value()),
			})

			parsedScssTemplate.Execute(scssFile, templateInput{
				ComponentName: m.textInput.Value(),
				SCSSName:      MakeFirstLowerCase(m.textInput.Value()),
			})

			return m, tea.Quit
		}

	// We handle errors just like any other message
	case errMsg:
		m.err = msg
		return m, nil
	}

	m.textInput, cmd = m.textInput.Update(msg)
	return m, cmd
}

func (m model) View() string {
	return fmt.Sprintf(
		"What's your favorite Pokémon?\n\n%s",
		m.textInput.View(),
	) + "\n"
}

func MakeFirstLowerCase(s string) string {

	if len(s) < 2 {
		return strings.ToLower(s)
	}

	bts := []byte(s)

	lc := bytes.ToLower([]byte{bts[0]})
	rest := bts[1:]

	return string(bytes.Join([][]byte{lc, rest}, nil))
}
